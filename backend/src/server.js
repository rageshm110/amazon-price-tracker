// backend/src/server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cron from "node-cron";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/amazonPriceTracker";
mongoose.connect(MONGO_URI);

const productSchema = new mongoose.Schema({
  url: { type: String, required: true },
  price: Number,
  lastChecked: Date,
});
const Product = mongoose.model("Product", productSchema);

// ====================================================================
// 1. Core Price Scraper Engine (Moved Upward for Proper Function Scope)
// ====================================================================
const scrapePrice = async (url) => {
  console.log(`Starting Puppeteer scrape engine execution for: ${url}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Optimized page load constraints for lighter CPU usage in Docker
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const priceText = await page.evaluate(() => {
      // Robust selectors matching current Amazon DOM pricing layouts
      const selector =
        document.querySelector(".a-price-whole") ||
        document.querySelector(".a-offscreen");
      return selector ? selector.innerText : null;
    });

    if (!priceText) {
      console.warn(`Warning: Selector target came up empty for URL: ${url}`);
      return null;
    }

    // Cleans up decimal points, commas, and currency symbols cleanly
    return parseFloat(priceText.replace(/[^\d.]/g, ""));
  } catch (error) {
    console.error(
      `Scraping engine crash configuration anomaly for ${url}:`,
      error.message,
    );
    return null;
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

// Create product and immediately trigger a background scrape
app.post("/api/product", async (req, res) => {
  try {
    const newProduct = new Product({ url: req.body.url });
    await newProduct.save();

    // Hand back the document right away so the frontend UI finishes loading instantly
    res.status(201).json(newProduct);

    // Asynchronously kick off the initial price retrieval in the background
    (async () => {
      try {
        const currentPrice = await scrapePrice(newProduct.url);
        const browser = await puppeteer.launch({
          headless: "new",
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // Uses container binary
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
          ],
        });
        if (currentPrice !== null) {
          newProduct.price = currentPrice;
          newProduct.lastChecked = new Date();
          await newProduct.save();
          console.log(
            `Initial automated extraction completed: ₹${currentPrice}`,
          );
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
    if (!product)
      return res
        .status(404)
        .json({ error: "Product target document not found" });

    // Respond immediately to the UI so the frontend doesn't time out or freeze
    res.json({
      message: "Refresh iteration spawned successfully in background",
    });

    // Execute the background job safely inside an isolated IIFE block
    (async () => {
      try {
        const currentPrice = await scrapePrice(product.url);
        if (currentPrice !== null) {
          product.price = currentPrice;
          product.lastChecked = new Date();
          await product.save();
          console.log(
            `Manual force refresh successfully saved to DB for: ${product._id}`,
          );
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
      const currentPrice = await scrapePrice(product.url);
      if (currentPrice !== null) {
        product.price = currentPrice;
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
