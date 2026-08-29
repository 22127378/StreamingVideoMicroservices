# ==============================================================================
# StreamForge FFmpeg Transcoder Worker Container
# Optimized for AWS EKS Spot Instances with KEDA Auto-scaling (Scale-to-Zero)
# ==============================================================================

FROM node:20-alpine

# Install FFmpeg and essential media libraries
RUN apk add --no-cache \
    ffmpeg \
    bash \
    libc6-compat

WORKDIR /app

# Copy dependency definitions and install production packages
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy worker application source
COPY src ./src

# Create temporary directory for FFmpeg scratch files and assign non-root permissions
RUN mkdir -p /tmp/streamforge-transcode && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 streamforge && \
    chown -R streamforge:nodejs /app /tmp/streamforge-transcode

USER streamforge

ENV NODE_ENV=production
ENV WORKER_TEMP_DIR=/tmp/streamforge-transcode

CMD ["node", "src/worker.js"]
