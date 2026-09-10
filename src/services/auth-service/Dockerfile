# ==============================================================================
# auth-service Dockerfile
# Multi-stage build — copies shared/ code at build time
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 streamforge

# Copy service dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy service source
COPY src ./src

# Copy shared code (build context must be src/ root: docker build -f services/auth-service/Dockerfile ../../)
COPY shared ./shared

USER streamforge
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["node", "src/server.js"]
