# BLKOUT CRM Dockerfile for Coolify
# Next.js 14 production deployment

FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files explicitly
COPY package.json ./
COPY package-lock.json ./

# Install dependencies (use npm install as fallback)
RUN npm ci || npm install --legacy-peer-deps

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the app
CMD ["node", "server.js"]
