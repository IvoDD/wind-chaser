# Stage 1: Build React frontend
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend with Chromium for Puppeteer
FROM node:24-slim AS production

RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/

COPY --from=frontend-build /app/frontend/build ./public

EXPOSE 5000
CMD ["node", "src/app.js"]
