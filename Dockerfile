# Base image com Node e Debian
FROM node:18-slim

# Instala Chromium
RUN apt-get update && \
    apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libxss1 \
    libnss3 \
    libx11-xcb1 \
    libxtst6 \
    wget \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Define a variável do Puppeteer para usar o Chrome do sistema
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
