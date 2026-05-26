# ─────────────────────────────────────────
# Stage 1: Builder
# Install semua dependency dan build TypeScript → JavaScript
# ─────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm (karena project pakai pnpm)
RUN npm install -g pnpm

WORKDIR /app

# Copy package files dulu (untuk cache layer)
COPY package.json pnpm-lock.yaml ./

# Install semua dependency termasuk devDependencies (butuh untuk build)
RUN pnpm install --frozen-lockfile

# Copy seluruh source code
COPY . .

# Build TypeScript ke JavaScript
RUN pnpm run build

# ─────────────────────────────────────────
# Stage 2: Production
# Ambil hanya hasil build + production dependencies
# Image final jauh lebih kecil
# ─────────────────────────────────────────
FROM node:22-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install HANYA production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy hasil build dari stage builder
COPY --from=builder /app/dist ./dist

# Cloud Run menggunakan PORT env variable
# NestJS harus listen di port ini
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Jalankan compiled JavaScript langsung (bukan via pnpm)
CMD ["node", "dist/main.js"]