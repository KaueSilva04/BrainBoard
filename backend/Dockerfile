FROM node:20-alpine

# Install openssl and libc6-compat for Prisma engine compatibility
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including prisma CLI and tsx)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src ./src

# Expose backend port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start application using tsx
CMD ["npx", "tsx", "src/index.ts"]
