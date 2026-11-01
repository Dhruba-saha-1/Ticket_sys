# Build from the monorepo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ticketing/api...
RUN pnpm --filter=@ticketing/api deploy --prod /out

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
