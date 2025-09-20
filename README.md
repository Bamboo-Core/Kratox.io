# NOC AI - Plataforma de Monitoramento e Automação de Redes

NOC AI é uma plataforma web moderna projetada para Provedores de Serviços de Internet (ISPs) e equipes de operações de rede (NOC). Ela se integra a sistemas de monitoramento existentes como o Zabbix para fornecer um painel unificado, diagnósticos aprimorados por IA, automação de segurança e um motor de regras personalizável para automatizar tarefas operacionais.

## Funcionalidades Principais

- **Dashboard Unificado:** Visualize alertas e o status de hosts de múltiplas instâncias do Zabbix em uma única interface, com filtros avançados por data, severidade e grupo de hosts.
- **Diagnóstico com IA:** Receba sugestões de comandos de diagnóstico relevantes para alertas de rede, adaptados ao vendor do equipamento (Cisco, Huawei, etc.), para acelerar a resolução de problemas.
- **Execução Remota de Comandos:** Execute com segurança comandos de diagnóstico em dispositivos de rede diretamente da interface web através de um microsserviço Python/Netmiko.
- **Automação de Bloqueio DNS (RPZ):**
  - **Manual:** Adicione domínios a uma lista de bloqueio específica do seu tenant.
  - **Assistido por IA:** Extraia domínios maliciosos de textos ou relatórios em PDF para bloqueio rápido.
  - **Feeds de Ameaças:** Inscreva-se em listas de bloqueio globais gerenciadas pelo administrador para proteção automática.
- **Motor de Regras de Automação:** Crie regras "SE-ENTÃO" para automatizar respostas a eventos de rede (Ex: "SE o alerta do Zabbix contiver 'phishing', ENTÃO extraia e bloqueie o domínio no DNS").
- **Arquitetura Multi-Tenant:** Cada cliente (tenant) tem seus próprios dados, regras e configurações de forma isolada e segura.
- **Painel de Administração:** Gerencie tenants, usuários, feeds de bloqueio DNS e os "blocos de construção" (critérios e ações) para o motor de automação.

---

## Stack de Tecnologias

A plataforma é construída como um monorepo com serviços distintos:

- **Frontend:**
  - **Framework:** Next.js (App Router)
  - **Linguagem:** TypeScript
  - **UI:** React, ShadCN UI & Tailwind CSS
  - **Gerenciamento de Estado:** Zustand (global) & TanStack Query (estado do servidor)

- **Backend (API Principal):**
  - **Runtime:** Node.js
  - **Framework:** Express.js
  - **Linguagem:** TypeScript
  - **Banco de Dados:** PostgreSQL
  - **IA Generativa:** Google Genkit (com modelos Gemini)
  - **Documentação da API:** Swagger (OpenAPI)

- **Microsserviço de Automação de Rede:**
  - **Linguagem:** Python
  - **Framework:** Flask
  - **Core:** Netmiko (para interações SSH com dispositivos de rede)

---

## Primeiros Passos

### Pré-requisitos

- **Node.js**: v20.x ou superior
- **npm** (ou yarn/pnpm)
- **Python**: v3.9 ou superior
- **Docker** & **Docker Compose** (Recomendado para o banco de dados)

### 1. Clonar o Repositório

```bash
git clone <url-do-seu-repositorio>
cd noc-ai
```

### 2. Configuração do Backend

1.  **Navegue até a pasta do backend:**
    ```bash
    cd backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Variáveis de Ambiente:** Crie um arquivo `.env` na pasta `backend` copiando o exemplo `.env.example` (se existir) ou criando do zero.

    ```bash
    # backend/.env
    
    # Conexão com o Banco de Dados
    DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/noc-ai-db"
    
    # Segredos da Aplicação
    JWT_SECRET="seu-segredo-jwt-super-secreto-de-32-chars"
    ENCRYPTION_KEY="uma-outra-chave-secreta-de-32-caracteres"
    
    # Chave da API do Google AI (Gemini)
    GOOGLE_API_KEY="sua-google-api-key"
    
    # Configuração do Zabbix (Opcional, mas necessário para a funcionalidade)
    ZABBIX_API_URL="http://seu-zabbix/api_jsonrpc.php"
    ZABBIX_API_TOKEN="seu-token-de-api-do-zabbix"
    
    # URL do Microsserviço Python
    NETMIKO_API_URL="http://localhost:5001"
    
    # Origens permitidas para CORS
    ALLOWED_ORIGINS="http://localhost:9002"
    ```

4.  **Banco de Dados (Recomendado: Docker):** A maneira mais fácil de rodar um banco de dados PostgreSQL compatível é com Docker. Se você não tiver o Docker, precisará instalar o PostgreSQL manualmente.
    - Na raiz do projeto, execute:
      ```bash
      docker-compose up -d
      ```
    - Isso iniciará um container com o PostgreSQL pronto para uso com as credenciais definidas no `.env`.

5.  **Criar Tabelas e Popular o Banco (Seed):** Execute este comando para criar todas as tabelas e adicionar os dados iniciais (admin, tenants, etc.).
    ```bash
    npm run db:seed
    ```

### 3. Configuração do Frontend

1.  **Volte para a raiz do projeto e instale as dependências:**
    ```bash
    cd ..
    npm install
    ```
2.  **Variáveis de Ambiente:** Crie um arquivo `.env` na raiz do projeto.
    ```bash
    # .env
    
    # URL da API do Backend
    NEXT_PUBLIC_API_URL="http://localhost:4001"
    ```

### 4. Configuração do Microsserviço Python (Netmiko)
*Ainda a ser documentado. Por enquanto, a API pode ser mockada ou rodada separadamente.*


---

## Rodando a Aplicação

Para rodar o frontend e o backend simultaneamente, execute o seguinte comando na **raiz do projeto**:

```bash
npm run dev
```

-   **Frontend (Next.js)** estará disponível em `http://localhost:9002`
-   **Backend (Node/Express)** estará disponível em `http://localhost:4001`
-   **Documentação da API (Swagger)** em `http://localhost:4001/api-docs`

---

## Scripts Disponíveis

-   `npm run dev`: Inicia os servidores de frontend e backend em modo de desenvolvimento.
-   `npm run build`: Compila a aplicação Next.js para produção.
-   `npm run start`: Inicia um servidor de produção Next.js.
-   `npm run lint`: Executa o ESLint para verificar a qualidade do código.
-   `npm run format`: Formata o código com o Prettier.

### Scripts do Backend (`/backend`)

-   `npm run dev`: Inicia o servidor backend com recarregamento automático (`tsx`).
-   `npm run build`: Compila o código TypeScript do backend para JavaScript.
-   `npm run start`: Inicia o servidor backend compilado.
-   `npm run db:seed`: (Re)cria as tabelas e popula o banco de dados com dados iniciais.
