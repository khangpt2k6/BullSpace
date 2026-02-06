FROM node:20-alpine

WORKDIR /app

# Copy shared dependencies first
COPY ../shared ./shared
COPY package*.json ./
COPY booking-service/package*.json ./booking-service/

# Install dependencies
RUN cd booking-service && npm install
RUN npm install

# Copy source code
COPY booking-service ./booking-service
COPY tsconfig.json ./

# Build TypeScript
RUN cd booking-service && npm run build

EXPOSE 3001

CMD ["node", "booking-service/dist/booking-service/server.js"]
