FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/

# Install deps without postinstall (prisma generate needs schema, not copied yet)
RUN npm ci --ignore-scripts

# Copy source
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build types package first, then server
RUN npm run build -w packages/types
RUN cd apps/server && npx prisma generate
RUN npm run build -w apps/server

# ---- Production image ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/package.json ./

EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
