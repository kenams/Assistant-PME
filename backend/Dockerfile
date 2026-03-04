FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src ./src
COPY .env.example ./

EXPOSE 3001
CMD ["node", "src/index.js"]