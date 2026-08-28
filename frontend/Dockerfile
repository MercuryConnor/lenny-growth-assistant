FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Next.js telemetry disable (optional but good practice)
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["npm", "run", "dev"]
