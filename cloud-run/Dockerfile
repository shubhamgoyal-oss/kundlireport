FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json ./
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]
