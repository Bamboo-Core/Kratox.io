# 🐳 Docker Setup - Studio Project

## 📋 Arquivos Criados

```
studio/
├── Dockerfile                    # Frontend Next.js
├── .dockerignore                 # Arquivos ignorados no build
├── docker-compose.yml            # Configuração base
├── docker-compose.dev.yml        # Desenvolvimento (hot reload)
├── docker-compose.prod.yml       # Produção (otimizado)
├── docker-helper.bat             # Script auxiliar Windows
├── .env.example                  # Template geral
├── .env.dev                      # Config desenvolvimento (NÃO commitar)
├── .env.prod.example             # Template produção
└── backend/
    ├── Dockerfile                # Backend Node.js
    └── .dockerignore
```

## 🗄️ Estratégia de Banco de Dados

| Ambiente | Banco | Database | Porta |
|----------|-------|----------|-------|
| **Dev Local** | Docker PostgreSQL | studio_dev | 5433 |
| **VM Dev** | Docker PostgreSQL | studio_dev | 5432 |
| **VM Prod** | Docker PostgreSQL | studio_prod | interno |
| **Render (atual)** | Managed PostgreSQL | netguard_db | externa |

### Transição Gradual
1. **Agora**: Dev usa Docker, Prod usa Render
2. **Depois**: Migrar prod para Docker na VM
3. **Final**: Desligar Render

## 🚀 Quick Start

### 1. Instalar Docker Desktop

Baixe e instale: https://www.docker.com/products/docker-desktop/

### 2. Iniciar Desenvolvimento

```bash
# Inicia PostgreSQL Docker + Backend + Frontend
docker-helper.bat dev
```

O banco `studio_dev` será criado automaticamente!

### 3. Popular o Banco (Seed)

```bash
# Após os containers estarem rodando
docker-helper.bat seed
```

## 🌐 URLs

| Serviço | Desenvolvimento | Produção |
|---------|-----------------|----------|
| Frontend | http://localhost:9002 | http://localhost:3000 |
| Backend | http://localhost:4000 | http://localhost:4000 |
| PostgreSQL | localhost:5433 | Interno (não exposto) |

## 🔧 Comandos

```bash
# Desenvolvimento
docker-helper.bat dev        # Inicia tudo
docker-helper.bat seed       # Popula banco
docker-helper.bat db         # Conecta ao PostgreSQL
docker-helper.bat logs       # Ver logs
docker-helper.bat stop       # Para tudo

# Produção
docker-helper.bat prod       # Inicia em modo produção

# Manutenção
docker-helper.bat backup     # Backup do banco
docker-helper.bat status     # Status dos containers
docker-helper.bat build      # Rebuild
docker-helper.bat clean      # Limpa tudo (CUIDADO!)
```

## 📁 Arquivos de Ambiente

### `.env.dev` (Desenvolvimento)
- ✅ Já configurado e pronto para usar
- Banco: `studio_dev` no Docker
- Não precisa do Render

### `.env.prod` (Produção)
- ⚠️ Criar a partir de `.env.prod.example`
- Trocar senhas por valores seguros
- Ajustar IPs/domínios

## 🔄 Workflow

### Desenvolvimento Local
```bash
docker-helper.bat dev    # Sobe tudo
docker-helper.bat seed   # Popula banco (primeira vez)
# Desenvolve...
docker-helper.bat stop   # Para tudo
```

### Deploy VM Dev
```bash
# Na VM
git clone <repo>
cd studio
# Copiar .env.dev (já está no repo, ignorado pelo git)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker-compose exec backend-node npm run db:seed
```

### Deploy VM Prod
```bash
# Na VM
git clone <repo>
cd studio
# Criar .env.prod a partir de .env.prod.example
cp .env.prod.example .env.prod
nano .env.prod  # Configurar senhas e IPs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker-compose exec backend-node npm run db:seed
```

## ⚠️ Notas Importantes

- **Nunca commite `.env.dev` ou `.env.prod`** (já no .gitignore)
- **PostgreSQL dev** roda na porta 5433 para não conflitar
- **PostgreSQL prod** não é exposto externamente
- **Backups**: Configure rotina de backup em produção!

## 🐛 Troubleshooting

### Porta em uso
```bash
docker-helper.bat stop
```

### Banco não conecta
```bash
docker-helper.bat logs postgres
```

### Rebuild completo
```bash
docker-helper.bat clean
docker-helper.bat dev
docker-helper.bat seed
```
