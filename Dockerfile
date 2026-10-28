FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11.12.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:044d090d0c3ccfd30722126ebe46704885698970c8a303419dc0d704d628f0da
WORKDIR /app
ENV NODE_ENV=production PORT=8080 PATH=/nodejs/bin:$PATH NODE_OPTIONS="--max-old-space-size=384 --max-semi-space-size=2" MALLOC_ARENA_MAX=2
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/infra/sessions.json ./infra/sessions.json
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["src/server/main.ts"]
