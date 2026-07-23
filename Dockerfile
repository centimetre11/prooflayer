# Prooflayer — Next.js 16 app that also drives a headless Chromium (Playwright)
# for real scanning. We build on the official Playwright image so the browser
# and all its system deps are present at runtime.
ARG PLAYWRIGHT_VERSION=v1.61.1-noble
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION} AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Corepack/npm come with the base image's Node. Keep npm cache small.
ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# ---- deps: install ALL deps (playwright/prisma/tsx are devDeps but needed at runtime) ----
FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema present.
COPY prisma ./prisma
RUN npm ci

# ---- build: compile the Next.js app ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runner: run the app (and, with a different command, the cron worker) ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/worker ./worker
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
# Default command runs the web app. The worker service overrides this in compose.
CMD ["npm", "run", "start"]
