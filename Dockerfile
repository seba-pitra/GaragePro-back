FROM node:18.20.3 as deps
WORKDIR /app
COPY package.json package.json
RUN yarn install --frozen-lockfile

FROM node:18.20.3 as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build


FROM node:18.20.3 as runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD [ "node", "dist/main.js" ]