FROM node:20-alpine

WORKDIR /app

# Install dependencies first so layer caches well
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "server.js"]
