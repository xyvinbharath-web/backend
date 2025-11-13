# Production-ready Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install only prod deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm ci --omit=dev

# Copy app
COPY . .

# Expose port
EXPOSE 5000

# Healthcheck: simple HTTP call to /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
