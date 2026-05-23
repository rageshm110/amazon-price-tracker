# Amazon Price Tracker 🚀

A modern, containerized full-stack web application designed to track Amazon.in product prices automatically on an hourly schedule or manually on-demand. Built using modern React 18, Node.js, MongoDB, and headless Chromium via Puppeteer.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Single-item state tracking locks
- **Backend:** Node.js 20 (ES Modules), Express.js, Node-Cron
- **Database:** MongoDB 7.0
- **Scraping Engine:** Puppeteer + Native Linux Chromium (Anti-bot proofed)
- **Containerization:** Docker & Docker Compose V2

---

## 🏗️ Architecture Layout

The application utilizes a reverse-proxy architecture running inside an isolated Docker network bridge. The frontend Nginx server proxies API traffic downstream to the backend service to eliminate Cross-Origin Resource Sharing (CORS) friction.

```text
                           [ User Browser ]
                                  │
                           (Port 8085:80)
                                  ▼
                     ┌──────────────────────────┐
                     │    Frontend Container    │
                     │  (Nginx Production Edge) │
                     └────────────┬─────────────┘
                                  │
                        (/api/ Reverse Proxy)
                                  ▼
                     ┌──────────────────────────┐
                     │    Backend Container     │
                     │   (Node.js 20 Service)   │
                     └───────┬────────────┬─────┘
                             │            │
                    (Port 27017)   (Scrapes Web)
                             ▼            ▼
               ┌────────────────┐    ┌───────────────┐
               │  Database (DB) │    │   Amazon.in   │
               │  (MongoDB 7.0) │    │ (Target Page) │
               └────────────────┘    └───────────────┘
```
