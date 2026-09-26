FROM node:26-alpine

RUN npm install -g corepack && \
    corepack enable npm

WORKDIR /server

COPY package.json .

COPY pnpm-lock.yaml .

RUN pnpm install

COPY src/ ./src/

EXPOSE 3000

CMD [ "pnpm", "run", "start" ]
