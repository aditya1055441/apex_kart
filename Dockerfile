# ==============================================================================
# Multi-Stage Dockerfile for Multi-Vendor E-Commerce (Render Ready)
# 
# How Docker & Render determine what to run:
# By default, Docker executes all intermediate builder stages and outputs 
# the VERY LAST stage in this file as the deployed production container.
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
# Stage 3: Production Runner (FINAL STAGE)
# Render automatically executes this final stage as the running container image.
# It hosts both the REST API and the compiled Angular frontend.
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only (keeps final image lightweight & fast)
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend from Stage 2
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/src/database/schema.sql ./src/database/schema.sql

# Copy compiled Angular frontend from Stage 1 into public folder for Express hosting
COPY --from=frontend-builder /app/frontend/dist/frontend/browser ./public

# Render dynamically binds $PORT (default 5000 or 10000)
EXPOSE 5000

CMD ["node", "dist/server.js"]
