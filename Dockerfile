# ==============================================================================
# Multi-Stage Root Dockerfile for Multi-Vendor E-Commerce (Render & Cloud Ready)
# Supports:
# 1. Fullstack All-in-One Deployment (Default target: fullstack)
# 2. Standalone Backend Deployment (--target backend)
# 3. Standalone Frontend Deployment (--target frontend)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Angular Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json frontend/angular.json frontend/tsconfig*.json ./
RUN npm install

COPY frontend/src/ ./src/
COPY frontend/public/ ./public/

RUN npm run build -- --configuration production

# ------------------------------------------------------------------------------
# Stage 2: Build Node.js TypeScript Backend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json backend/tsconfig.json ./
RUN npm install

COPY backend/src/ ./src/
RUN npm run build

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

# ------------------------------------------------------------------------------
# Target: Standalone Frontend Only (Nginx)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS frontend

ENV PORT=80
ENV BACKEND_URL=http://localhost:5000

COPY --from=frontend-builder /app/frontend/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
