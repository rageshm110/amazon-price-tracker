# backend/Dockerfile
FROM node:20-slim AS base

# Install official system chromium and all required OS-level runtime libraries
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system-installed Chromium instead of fetching its own binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "src/server.js"]