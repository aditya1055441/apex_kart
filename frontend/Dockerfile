# Stage 1: Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency configs
COPY package*.json angular.json tsconfig*.json ./
RUN npm install

# Copy source and assets
COPY src/ ./src/
COPY public/ ./public/

# Compile production bundle
RUN npm run build -- --configuration production

# Stage 2: Serve using Nginx Alpine (Render Compatible)
FROM nginx:alpine

# Default environment variables for Render
ENV PORT=80
ENV BACKEND_URL=http://localhost:5000

# Copy built artifacts from Stage 1
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copy Nginx template for dynamic environment variable substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
