# Multi-stage Dockerfile for Backend (Render Ready)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions and TypeScript config
COPY package*.json tsconfig.json ./

# Install dependencies including build tools
RUN npm install

# Copy application source
COPY src/ ./src/

# Build TypeScript to dist
RUN npm run build

# Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist
COPY src/database/schema.sql ./src/database/schema.sql

# Render provides dynamic PORT environment variable (default 5000 or 10000)
EXPOSE 5000

CMD ["node", "dist/server.js"]
