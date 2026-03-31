# Backend Node.js Dockerfile
# Multi-stage build para imagem otimizada

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./
COPY esbuild.config.js ./ 

RUN npm install
# Copiar código fonte
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar Python3 e dependências dos scripts PDF
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir pymupdf pdfplumber --break-system-packages

# Instalar apenas dependências de produção
COPY package*.json ./

RUN npm install

# Copiar arquivos buildados e scripts Python
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expor porta
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Iniciar aplicação
CMD ["node", "dist/index.js"]
