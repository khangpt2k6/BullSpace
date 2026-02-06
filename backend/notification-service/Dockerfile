FROM node:20-alpine

WORKDIR /app

# Copy shared dependencies first
COPY ../shared ./shared
COPY package*.json ./
COPY notification-service/package*.json ./notification-service/

# Install dependencies
RUN cd notification-service && npm install
RUN npm install

# Copy source code
COPY notification-service ./notification-service
COPY tsconfig.json ./

# Build TypeScript
RUN cd notification-service && npm run build

EXPOSE 3002

CMD ["node", "notification-service/dist/notification-service/server.js"]
