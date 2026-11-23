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
RUN pnpm --filter @padb/website build \
    && pnpm --filter @padb/website deploy --prod --legacy /app

FROM node:26-slim
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
ENV NODE_ENV=production \
    PORT=3100
EXPOSE 3100
# As the start script, without needing pnpm at runtime. --static is relative to the entry
CMD ["node_modules/.bin/srvx", "serve", "--prod", "--entry", "dist/server/server.js", "--static", "../client"]
