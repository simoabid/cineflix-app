# =============================================================================
# CineFlix Multi-Stage Dockerfile
# Stage 1: Build frontend (Vite) + backend (TypeScript)
# Stage 2: Production runtime with minimal footprint
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install root dependencies (frontend)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --ignore-scripts

# Copy source
COPY . .

# Build frontend (Vite → dist/)
RUN npm run build -- --mode production 2>/dev/null || npx vite build

# Build backend (TypeScript → backend/dist/)
RUN cd backend && npx tsc

# ---- Stage 2: Production ----
FROM node:22-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S cineflix && \
    adduser -S cineflix -u 1001 -G cineflix

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/

# Install production-only backend deps
RUN cd backend && npm ci --omit=dev --ignore-scripts

# Create logs directory
RUN mkdir -p /app/backend/logs && chown -R cineflix:cineflix /app

# Switch to non-root user
USER cineflix

# Expose port (matches env.ts default PORT=3001)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
ENV NODE_ENV=production
CMD ["node", "backend/dist/server.js"]
