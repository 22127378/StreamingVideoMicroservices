# ==============================================================================
# StreamForge Frontend SPA Dockerfile
# Optimized Multi-Stage Build with Vite & Nginx Alpine for AWS EKS
# ==============================================================================

# --- STAGE 1: Build Static Assets ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY . .
RUN npm run build

# --- STAGE 2: Production Nginx Server ---
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default static assets
RUN rm -rf ./*

# Copy built SPA artifacts
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
