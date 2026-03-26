# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy env vars needed for build
ENV NEXTAUTH_SECRET=build-secret-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV ANTHROPIC_API_KEY=placeholder
ENV OPENAI_API_KEY=placeholder
ENV ECOURTS_API_KEY=placeholder
ENV CRON_SECRET=placeholder
ENV SUPABASE_URL=https://placeholder.supabase.co
ENV SUPABASE_SERVICE_KEY=placeholder
ENV SUPABASE_PUBLISHABLE_KEY=placeholder
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL 3 for Prisma query engine (linux-musl-openssl-3.0.x binary target)
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create storage directory
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
