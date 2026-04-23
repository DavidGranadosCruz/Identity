# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG DATABASE_URL=postgresql://identity:identity@localhost:5432/identity?schema=public
ARG AUTH_SECRET=build-secret
ARG APP_URL=http://localhost:3000
ARG MINIO_ENDPOINT=localhost
ARG MINIO_PORT=9000
ARG MINIO_ACCESS_KEY=minioadmin
ARG MINIO_SECRET_KEY=minioadmin
ARG MINIO_BUCKET_UPLOADS=identity-uploads
ARG MINIO_BUCKET_GENERATIONS=identity-generations
ENV DATABASE_URL=${DATABASE_URL}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV APP_URL=${APP_URL}
ENV MINIO_ENDPOINT=${MINIO_ENDPOINT}
ENV MINIO_PORT=${MINIO_PORT}
ENV MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
ENV MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
ENV MINIO_BUCKET_UPLOADS=${MINIO_BUCKET_UPLOADS}
ENV MINIO_BUCKET_GENERATIONS=${MINIO_BUCKET_GENERATIONS}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache curl docker-cli
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/types ./types
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/middleware.ts ./middleware.ts

EXPOSE 3000
EXPOSE 3001

CMD ["pnpm", "start"]
