FROM node:20-alpine

# Install openssl and libc6-compat for Prisma engine compatibility
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions first so npm install stays cached when prisma/src changes
COPY package*.json ./

# Install all dependencies (including prisma CLI and tsx)
RUN npm install

# Copy prisma schema and generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY MCP_DOCUMENTATION.md* ./

# Expose backend port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start application using tsx
CMD ["npx", "tsx", "src/index.ts"]
