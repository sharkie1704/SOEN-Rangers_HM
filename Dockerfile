from node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npm ci 

COPY . .

EXPOSE 5173 3000

CMD ["npm", "run", "dev"]