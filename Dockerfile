# ==============================================================================
# Multi-Stage Root Dockerfile for Multi-Vendor E-Commerce (Render & Cloud Ready)
# Supports:
# 1. Fullstack All-in-One Deployment (Default target: fullstack)
# 2. Standalone Backend Deployment (--target backend)
# 3. Standalone Frontend Deployment (--target frontend)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 3: Unified Fullstack Production Image (Default Target)
# Serves both the REST API and the Angular Web Storefront from a single container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS fullstack
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/src/database/schema.sql ./src/database/schema.sql

# Copy built Angular frontend into public directory for Express static hosting
COPY --from=frontend-builder /app/frontend/dist/frontend/browser ./public

EXPOSE 5000

CMD ["node", "dist/server.js"]

# ------------------------------------------------------------------------------
# Target: Standalone Backend Only
# ------------------------------------------------------------------------------
FROM node:20-alpine AS backend
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/src/database/schema.sql ./src/database/schema.sql

EXPOSE 5000

CMD ["node", "dist/server.js"]
