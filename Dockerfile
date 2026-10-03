FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11.12.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:afc6657a4b662f9cb69ca892b0596e55d6ef81a10e83ee8887b13f602877df89
WORKDIR /app
ENV NODE_ENV=production PORT=8080 PATH=/nodejs/bin:$PATH NODE_OPTIONS=--max-old-space-size=640
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/infra/sessions.json ./infra/sessions.json
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["src/server/main.ts"]
