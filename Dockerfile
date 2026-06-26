FROM node:26-slim AS build

RUN npm i -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN pnpm --filter=@exploria/server run build
RUN pnpm --filter @exploria/server deploy --legacy --prod /server

ENV VITE_API_BASE_URL=/api

ARG VITE_DEFAULT_MODEL
ENV VITE_DEFAULT_MODEL=$VITE_DEFAULT_MODEL

RUN pnpm --filter=@exploria/client run build

FROM node:26-slim

RUN apt-get update && apt-get install --yes curl
RUN npm i -g pnpm
WORKDIR /app

COPY --from=build /server .
COPY --from=build /app/client/dist ./public

ENV CI=true
ENV NODE_ENV=production
ENV BASE_PATH=/api
ENV PUBLIC_DIR=./public

EXPOSE 3000
CMD node dist/main.js
