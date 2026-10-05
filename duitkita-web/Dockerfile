# ─────────────────────────────────────────
# Build: compile the Vite app into static assets
# ─────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines import.meta.env.* at build time, not runtime — so the API
# base URL has to be baked in here via a build arg, not a Cloud Run env var.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ─────────────────────────────────────────
# Production: nginx serving the built static files
# ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
