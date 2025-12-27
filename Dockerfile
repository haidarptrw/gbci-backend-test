FROM node:24-alpine AS base

# Enable corepack to use pnpm without installing it manually
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Dependencies Stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Development Stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Default command for dev
CMD ["pnpm", "run", "start:dev"]

# Test Stage
# Run this in CI/CD pipelines
FROM base AS test
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run test

# Builder Stage
# Compiles the app for production
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
# Remove devDependencies to keep the final image small
RUN pnpm prune --prod

# Production Stage
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed from previous stages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000

CMD ["node", "dist/main"]