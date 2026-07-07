FROM node:26-slim AS build

RUN npm i -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .
COPY server/package.json ./server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN pnpm --filter @exploria/server deploy --legacy --prod /server

FROM node:26-slim

RUN apt-get update && apt-get install --yes curl
RUN npm i -g pnpm
WORKDIR /app

COPY --from=build /server .

EXPOSE 3000

CMD node src/main.ts
