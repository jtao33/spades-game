# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Build the socket server
RUN npm run build:socket

# Production stage for Next.js
FROM node:22-alpine AS nextjs-runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/spades.db"

# Run migrations and start server
CMD npx prisma migrate deploy && node server.js

# Production stage for Socket.io server
FROM node:22-alpine AS socket-runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socketjs

# Copy socket server
COPY --from=builder /app/dist/socket-server.js ./socket-server.js

# Set ownership
RUN chown -R socketjs:nodejs /app

USER socketjs

EXPOSE 3001

ENV SOCKET_PORT=3001

CMD ["node", "socket-server.js"]
