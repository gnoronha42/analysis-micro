FROM node:20-slim

# Configurações essenciais
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    DISABLE_PUPPETEER_SANDBOX=true

# Instalação do Chrome e dependências mínimas
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /usr/share/keyrings/googlechrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Verifica a instalação do Chrome
RUN ls -la /usr/bin/google-chrome-stable && google-chrome --version

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

CMD ["npm", "start"]