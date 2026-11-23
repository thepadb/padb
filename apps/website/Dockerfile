# Builds without BuildKit features, so the legacy builder works too.
# Built from the repo root: docker build -f apps/website/Dockerfile .

FROM node:26-slim AS build
WORKDIR /src
# Version comes from packageManager in package.json
RUN npm install --global corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/website/package.json apps/website/
COPY packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile --filter @padb/website...
COPY packages packages
COPY apps/website apps/website
# The server bundles its dependencies (vite.config.ts), so the runtime needs only dist and srvx
RUN pnpm --filter @padb/website build \
    && mkdir -p /app/node_modules \
    && cp -r apps/website/dist /app/dist \
    && cp -rL apps/website/node_modules/srvx /app/node_modules/srvx

# Distroless: no shell or package manager; runs as the non-root user
FROM gcr.io/distroless/nodejs26-debian13:nonroot
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production \
    PORT=3100
EXPOSE 3100
# The image's entrypoint is node. As the start script; --static is relative to the entry
CMD ["node_modules/srvx/bin/srvx.mjs", "serve", "--prod", "--entry", "dist/server/server.js", "--static", "../client"]
