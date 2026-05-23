// backend/src/server.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';
import puppeteer from 'puppeteer';

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/amazonPriceTracker';
mongoose.connect(MONGO_URI);

const productSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, default: 'Fetching details...' },
  price: Number,
  lastChecked: Date
});
const Product = mongoose.model('Product', productSchema);

// ====================================================================
// 1. Core Price Scraper Engine
// ====================================================================
const scrapePrice = async (url) => {
  console.log(`Starting anti-bot Puppeteer scrape engine execution for: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  try {
    const page = await browser.newPage();

    // Emulate a standard modern desktop view port and identity profile
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Safety check: Detect if Amazon served a robot block/CAPTCHA page
    const pageTitle = await page.title();
    if (pageTitle.toLowerCase().includes('captcha') || pageTitle.toLowerCase().includes('robot')) {
      console.error('⚠️ Blocked by Amazon CAPTCHA challenge screen.');
      return { name: 'Verification Required (CAPTCHA)', price: null };
    }

    // Evaluate the page DOM to extract both target nodes
    const scrapedData = await page.evaluate(() => {
      // 1. Extract Product Title
      const titleEl = document.querySelector('#productTitle');
      const name = titleEl ? titleEl.innerText.trim() : 'Unknown Amazon Product';

      // 2. Extract Price text via multi-layer fallback selectors
      const priceSelectors = [
        '.apexPriceToPay .a-offscreen',
        '.a-price-whole',
        '#priceblock_ourprice',
        '.a-color-price'
      ];
      
      let priceText = null;
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim()) {
          priceText = el.innerText.trim();
          break;
        }
      }
      
      return { name, priceText };
    });

    // Parse the textual price into a clean float value
    let cleanPrice = null;
    if (scrapedData.priceText) {
      cleanPrice = parseFloat(scrapedData.priceText.replace(/[^\d.]/g, ''));
      console.log(`Scrape successful! Title: "${scrapedData.name}" -> Price: ₹${cleanPrice}`);
    } else {
      console.warn(`Warning: Price selectors came up empty for: ${url}`);
    }

    return {
      name: scrapedData.name,
      price: cleanPrice
    };

  } catch (error) {
    console.error(`Scraping engine crash configuration anomaly for ${url}:`, error.message);
    return { name: 'Scraping Error', price: null };
  } finally {
    await browser.close();
  }
};

// ====================================================================
// 2. API Endpoints
// ====================================================================

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product and immediately trigger an integrated background scrape
app.post("/api/product", async (req, res) => {
  try {
    const newProduct = new Product({ url: req.body.url });
    await newProduct.save();

    // Hand back the document right away so the frontend UI finishes loading instantly
    res.status(201).json(newProduct);

    // Asynchronously kick off the initial price/name retrieval in the background
    (async () => {
      try {
        const scrapedResult = await scrapePrice(newProduct.url);
        if (scrapedResult.price !== null) {
          newProduct.name = scrapedResult.name;
          newProduct.price = scrapedResult.price;
          newProduct.lastChecked = new Date();
          await newProduct.save();
          console.log(`Initial automated extraction completed for: ${scrapedResult.name}`);
        }
      } catch (bgError) {
        console.error("Initial background scrape failed:", bgError.message);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Force manual on-demand background refresh
app.post("/api/product/:id/refresh", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product target document not found" });

    // Respond immediately to the UI so the frontend doesn't time out or freeze
    res.json({ message: "Refresh iteration spawned successfully in background" });

    // Execute the background job safely inside an isolated IIFE block
    (async () => {
      try {
        const scrapedResult = await scrapePrice(product.url);
        if (scrapedResult.price !== null) {
          product.name = scrapedResult.name;
          product.price = scrapedResult.price;
          product.lastChecked = new Date();
          await product.save();
          console.log(`Manual force refresh successfully saved to DB for: ${product._id}`);
        }
      } catch (bgError) {
        console.error("Manual background refresh failed:", bgError.message);
      }
    })();
  } catch (err) {
    console.error("Error within refresh route handler orchestration:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete("/api/product/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.send({ message: "Product tracking removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 3. Automated Cron Scheduler Loop
// ====================================================================
cron.schedule("0 * * * *", async () => {
  console.log("Running automated scheduled price check iteration...");
  try {
    const products = await Product.find();
    for (const product of products) {
      const scrapedResult = await scrapePrice(product.url);
      if (scrapedResult.price !== null) {
        product.name = scrapedResult.name;
        product.price = scrapedResult.price;
        product.lastChecked = new Date();
        await product.save();
      }
    }
  } catch (cronError) {
    console.error("Global Cron scheduler runner exception:", cronError.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));