FROM node:26-slim AS build

RUN npm i -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_DEFAULT_MODEL
ENV VITE_DEFAULT_MODEL=$VITE_DEFAULT_MODEL

RUN pnpm --filter=@exploria/client run build

FROM nginx

RUN apt-get update
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
