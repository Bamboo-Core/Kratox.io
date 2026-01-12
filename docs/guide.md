# Guia de Integração NOC AI + n8n

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Sistema de Permissões](#3-sistema-de-permissões)
4. [Endpoints da API](#4-endpoints-da-api)
5. [Configuração do n8n](#5-configuração-do-n8n)
6. [Workflows de Exemplo](#6-workflows-de-exemplo)
7. [Criando Agentes de IA](#7-criando-agentes-de-ia)
8. [Boas Práticas](#8-boas-práticas)

---

## 1. Visão Geral

### O que é o NOC AI?

O NOC AI é uma plataforma de monitoramento e automação de redes para ISPs e equipes de NOC. Ela integra com o Zabbix para fornecer:

- Dashboard unificado de alertas
- Diagnósticos assistidos por IA
- Automação de bloqueio DNS
- Motor de regras de automação

### Objetivo da Integração com n8n

Integrar o NOC AI com n8n para criar **agentes de IA** que:

- Analisem alertas em tempo real
- Sugiram diagnósticos e soluções
- Executem ações automatizadas
- Interajam via chat com operadores

---

## 2. Arquitetura do Sistema

### Stack de Tecnologias

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 14 + React + TypeScript + Tailwind + ShadCN UI         │
│  Porta: 9002                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  Node.js + Express + TypeScript                                  │
│  Porta: 4001                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Genkit    │  │   Zabbix    │  │   Rules     │              │
│  │   (AI)      │  │   Service   │  │   Engine    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Google AI  │    │   Zabbix    │    │ PostgreSQL  │
│  (Gemini)   │    │   Server    │    │  (Render)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Fluxo de Alertas Atual

```
Zabbix → Webhook → Backend → Rule Engine → Ações Automáticas
                      │
                      └─→ Supabase (histórico)
```

### Fluxo Proposto com n8n

```
Zabbix → Webhook → Backend → n8n Workflow → Agente IA → Ação/Resposta
                                  │
                                  └─→ Chat (operador)
```

---

## 3. Sistema de Permissões

### Roles de Usuário

| Role           | Descrição               | Permissões                               |
| -------------- | ----------------------- | ---------------------------------------- |
| `admin`        | Administrador do tenant | Acesso total a todos os hosts e alertas  |
| `collaborator` | Colaborador             | Acesso baseado em `zabbix_hostgroup_ids` |
| `cliente`      | Cliente final           | Acesso restrito aos seus hostgroups      |

### Estrutura do Token JWT

```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin|collaborator|cliente",
  "tenantName": "Tenant Name",
  "zabbix_hostgroup_ids": ["15", "16"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Lógica de Acesso aos Alertas

```typescript
// Se role === 'admin': acesso a TODOS os hosts/alertas
// Se role !== 'admin':
//   - Se zabbix_hostgroup_ids.length > 0: acesso apenas a esses grupos
//   - Se zabbix_hostgroup_ids.length === 0: sem acesso (array vazio)
```

---

## 4. Endpoints da API

### Base URL

- **Local**: `http://localhost:4001`
- **Produção**: `https://noc-ai-backend.onrender.com`

### Autenticação

**POST** `/api/auth/login`

```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "uuid",
    "tenantId": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "zabbix_hostgroup_ids": []
  }
}
```

### Alertas do Zabbix

**GET** `/api/zabbix/alerts`

```bash
# Headers
Authorization: Bearer <token>

# Query Parameters
?time_from=1767112999    # Unix timestamp (opcional)
&time_to=1767717799      # Unix timestamp (opcional)
&groupid=15              # ID do grupo (admin apenas)
```

**GET** `/api/zabbix/hosts`

```bash
Authorization: Bearer <token>

# Query Parameters
?groupid=15              # Filtrar por grupo (admin apenas)
```

### Webhook do Zabbix (Público)

**POST** `/api/zabbix/event-handler`

```json
{
  "eventid": "12345"
}
```

### Endpoints de IA

**POST** `/api/ai/extract-domains`

```json
// Request
{
  "text": "Detectado acesso a malware.com e phishing.net"
}

// Response
{
  "domains": ["malware.com", "phishing.net"]
}
```

**POST** `/api/ai/suggest-commands`

```json
// Request
{
  "alertName": "High CPU utilization on router-01",
  "hostName": "router-01",
  "vendor": "cisco_ios"
}

// Response
{
  "commands": [
    "show processes cpu sorted",
    "show memory statistics"
  ]
}
```

**POST** `/api/ai/diagnose`

```json
// Request
{
  "alertName": "Link down on interface GigabitEthernet0/1",
  "hostName": "router-01",
  "hostId": "10501"
}

// Response
{
  "diagnosis": "...",
  "suggestedActions": [...]
}
```

---

## 5. Configuração do n8n

### Pré-requisitos

- n8n instalado (self-hosted ou cloud)
- Acesso à API do NOC AI
- Credenciais de usuário válidas

### Passo 1: Configurar Credenciais

No n8n, crie uma credencial do tipo **HTTP Request**:

```yaml
Name: NOC AI API
Base URL: http://localhost:4001 # ou produção
Authentication: None # Token será passado nos headers
```

### Passo 2: Workflow de Autenticação

Crie um workflow para obter e renovar o token:

```
[Trigger: Cron] → [HTTP Request: Login] → [Set Token Variable]
```

### Passo 3: Configurar Webhook para Receber Alertas

1. Crie um **Webhook Node** no n8n
2. Configure o Zabbix para enviar alertas para a URL do webhook n8n
3. Ou configure o backend NOC AI para encaminhar eventos

---

## 5.1. Configuração do Zabbix para Enviar Alertas

Esta seção explica como configurar o Zabbix para enviar alertas automaticamente para o webhook do n8n.

### Passo 1: Criar Media Type (Webhook)

1. Acesse o Zabbix: **Administration → Media Types**
2. Clique em **Create media type**
3. Configure:

```yaml
Name: n8n Webhook
Type: Webhook
```

4. Em **Parameters**, adicione:

| Name        | Value                                       |
| ----------- | ------------------------------------------- |
| `URL`       | `https://seu-n8n.com/webhook/zabbix-alerts` |
| `HTTPProxy` | (deixe vazio ou configure se necessário)    |
| `To`        | `{ALERT.SENDTO}`                            |
| `Subject`   | `{ALERT.SUBJECT}`                           |
| `Message`   | `{ALERT.MESSAGE}`                           |

5. Cole o seguinte **Script** no campo de script:

```javascript
var params = JSON.parse(value);
var req = new HttpRequest();

req.addHeader('Content-Type: application/json');

var payload = {
  eventid: params.eventid,
  event_name: params.event_name,
  host: params.host,
  host_ip: params.host_ip,
  severity: params.severity,
  status: params.status,
  trigger_id: params.trigger_id,
  trigger_name: params.trigger_name,
  trigger_description: params.trigger_description,
  event_time: params.event_time,
  hostgroups: params.hostgroups,
  tags: params.tags,
};

var response = req.post(params.URL, JSON.stringify(payload));

if (req.getStatus() !== 200) {
  throw 'Failed to send webhook: ' + response;
}

return 'OK';
```

6. Adicione os **Parameters** para o script:

| Name                  | Value                   |
| --------------------- | ----------------------- |
| `eventid`             | `{EVENT.ID}`            |
| `event_name`          | `{EVENT.NAME}`          |
| `host`                | `{HOST.NAME}`           |
| `host_ip`             | `{HOST.IP}`             |
| `severity`            | `{EVENT.SEVERITY}`      |
| `status`              | `{EVENT.STATUS}`        |
| `trigger_id`          | `{TRIGGER.ID}`          |
| `trigger_name`        | `{TRIGGER.NAME}`        |
| `trigger_description` | `{TRIGGER.DESCRIPTION}` |
| `event_time`          | `{EVENT.TIME}`          |
| `hostgroups`          | `{HOST.GROUPS}`         |
| `tags`                | `{EVENT.TAGS}`          |

7. Clique em **Add** e depois **Test** para verificar

### Passo 2: Criar Usuário para Alertas

1. Vá em **Administration → Users**
2. Clique em **Create user**
3. Configure:

```yaml
Username: n8n_alerts
Groups: Selecione um grupo com permissões de leitura
Password: (defina uma senha)
```

4. Na aba **Media**, clique em **Add**:

```yaml
Type: n8n Webhook
Send to: n8n # (pode ser qualquer valor, usado apenas como identificador)
When active: 1-7,00:00-24:00 # 24/7
Use if severity: ✓ Disaster, ✓ High, ✓ Average (marque os desejados)
Enabled: ✓
```

5. Na aba **Permissions**, configure as permissões necessárias

### Passo 3: Criar Action (Trigger Action)

1. Vá em **Configuration → Actions → Trigger actions**
2. Clique em **Create action**
3. Na aba **Action**:

```yaml
Name: Send to n8n
Conditions:
  - Trigger severity >= Average (ou conforme desejado)
  # Opcional: filtrar por host groups específicos
  - Host group equals "Fibra Veloz - SP"
Enabled: ✓
```

4. Na aba **Operations**, clique em **Add**:

```yaml
# Para PROBLEM (quando alerta dispara)
Operations:
  - Send to user: n8n_alerts
  - Send only to: n8n Webhook

Default operation step duration: 1h
Default subject: [PROBLEM] {EVENT.NAME}
Default message:
  {
    "eventid": "{EVENT.ID}",
    "event_name": "{EVENT.NAME}",
    "host": "{HOST.NAME}",
    "severity": "{EVENT.SEVERITY}",
    "status": "PROBLEM"
  }
```

5. Na aba **Recovery operations** (opcional):

```yaml
# Para quando o alerta é resolvido
Operations:
  - Send to user: n8n_alerts
  - Send only to: n8n Webhook

Default subject: [RESOLVED] {EVENT.NAME}
Default message:
  {
    "eventid": "{EVENT.ID}",
    "event_name": "{EVENT.NAME}",
    "host": "{HOST.NAME}",
    "status": "RESOLVED"
  }
```

### Passo 4: Configurar o Webhook Node no n8n

No n8n, configure o **Webhook Node** para receber os dados:

```yaml
HTTP Method: POST
Path: zabbix-alerts
Response Mode: Immediately
Response Code: 200
```

O payload recebido terá este formato:

```json
{
  "eventid": "12345",
  "event_name": "High CPU utilization on router-01",
  "host": "router-01",
  "host_ip": "192.168.1.1",
  "severity": "3",
  "status": "PROBLEM",
  "trigger_id": "67890",
  "trigger_name": "CPU > 90%",
  "trigger_description": "CPU usage exceeded threshold",
  "event_time": "2026-01-06 14:30:00",
  "hostgroups": "Fibra Veloz - SP, Routers",
  "tags": "scope:performance, type:cpu"
}
```

### Passo 5: Testar a Integração

1. **No Zabbix**: Vá em **Administration → Media Types**
2. Selecione **n8n Webhook** e clique em **Test**
3. Preencha os campos de teste:

```yaml
To: test
Subject: Test Alert
Message: { 'eventid': '99999', 'event_name': 'Test Event', 'host': 'test-host' }
```

4. Verifique no n8n se o webhook recebeu os dados

### Macros Úteis do Zabbix

| Macro                   | Descrição                |
| ----------------------- | ------------------------ |
| `{EVENT.ID}`            | ID único do evento       |
| `{EVENT.NAME}`          | Nome/descrição do evento |
| `{EVENT.SEVERITY}`      | Severidade (0-5)         |
| `{EVENT.STATUS}`        | PROBLEM ou RESOLVED      |
| `{EVENT.TIME}`          | Hora do evento           |
| `{EVENT.DATE}`          | Data do evento           |
| `{HOST.NAME}`           | Nome do host             |
| `{HOST.IP}`             | IP do host               |
| `{HOST.GROUPS}`         | Grupos do host           |
| `{TRIGGER.ID}`          | ID do trigger            |
| `{TRIGGER.NAME}`        | Nome do trigger          |
| `{TRIGGER.DESCRIPTION}` | Descrição do trigger     |
| `{ITEM.NAME}`           | Nome do item             |
| `{ITEM.VALUE}`          | Valor atual do item      |

### Filtrar por Host Groups (Para Multi-Tenant)

Para enviar alertas apenas de grupos específicos, adicione condições na Action:

```yaml
Conditions:
  Type: Host group
  Operator: equals
  Host group: 'Cliente A - Routers'
```

Você pode criar múltiplas Actions, uma para cada tenant/cliente, enviando para webhooks diferentes ou incluindo um identificador no payload.

---

## 6. Workflows de Exemplo

### Workflow 1: Monitoramento de Alertas

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Webhook   │───▶│  Filtrar    │───▶│  Analisar   │───▶│   Notificar │
│  (Zabbix)   │    │ Severidade  │    │  com IA     │    │    Chat     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Configuração do Webhook Node:**

```json
{
  "httpMethod": "POST",
  "path": "zabbix-alerts",
  "responseMode": "onReceived"
}
```

**Configuração do Filtro (IF Node):**

```javascript
// Filtrar apenas alertas de alta severidade
return $json.severity >= 3;
```

### Workflow 2: Agente de Diagnóstico

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Chat      │───▶│  OpenAI/    │───▶│  NOC AI     │───▶│  Responder  │
│  Trigger    │    │  Gemini     │    │  API Call   │    │    Chat     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Workflow 3: Bloqueio DNS Automático

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Webhook    │───▶│  Extrair    │───▶│  Bloquear   │───▶│    Log      │
│  (Alerta)   │    │  Domínios   │    │    DNS      │    │  Resultado  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 7. Criando Agentes de IA

### Conceito de Agente no n8n

Um agente de IA no n8n combina:

1. **LLM** (OpenAI, Gemini, etc.)
2. **Tools** (APIs externas)
3. **Memory** (contexto da conversa)

### Exemplo: Agente NOC

```javascript
// System Prompt para o Agente
const systemPrompt = `
Você é um agente de NOC especializado em redes de ISPs.
Você tem acesso às seguintes ferramentas:

1. get_alerts: Buscar alertas ativos do Zabbix
2. get_hosts: Listar hosts monitorados
3. diagnose_alert: Analisar um alerta específico
4. suggest_commands: Sugerir comandos de diagnóstico
5. block_domain: Bloquear domínio no DNS

Ao receber uma pergunta:
1. Identifique o contexto do problema
2. Use as ferramentas apropriadas
3. Forneça uma resposta clara e ações recomendadas

Lembre-se: O usuário pode ter acesso limitado a certos hostgroups.
Sempre respeite as permissões do tenant.
`;
```

### Configurando Tools no n8n

**Tool: Get Alerts**

```json
{
  "name": "get_alerts",
  "description": "Busca alertas ativos do Zabbix. Retorna lista de problemas.",
  "parameters": {
    "type": "object",
    "properties": {
      "time_from": {
        "type": "string",
        "description": "Unix timestamp de início (opcional)"
      },
      "severity_min": {
        "type": "number",
        "description": "Severidade mínima (1-5)"
      }
    }
  }
}
```

**Tool: Diagnose Alert**

```json
{
  "name": "diagnose_alert",
  "description": "Analisa um alerta e sugere diagnóstico",
  "parameters": {
    "type": "object",
    "properties": {
      "alertName": {
        "type": "string",
        "description": "Nome/descrição do alerta"
      },
      "hostName": {
        "type": "string",
        "description": "Nome do host afetado"
      }
    },
    "required": ["alertName", "hostName"]
  }
}
```

---

## 8. Boas Práticas

### Segurança

1. **Nunca exponha tokens** - Use variáveis de ambiente
2. **Valide permissões** - Sempre passe o token do usuário
3. **Rate limiting** - Implemente limites de requisições
4. **Logs** - Registre todas as ações para auditoria

### Performance

1. **Cache de tokens** - Renove apenas quando necessário
2. **Batch requests** - Agrupe requisições quando possível
3. **Timeout adequado** - Configure timeouts para APIs lentas

### Manutenção

1. **Versionamento** - Use tags para versões dos workflows
2. **Documentação** - Documente cada workflow
3. **Testes** - Crie workflows de teste separados

---

## Apêndice A: Variáveis de Ambiente

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Auth
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Zabbix
ZABBIX_API_URL=https://your-zabbix/api_jsonrpc.php
ZABBIX_API_TOKEN=your-zabbix-token

# AI
GOOGLE_API_KEY=your-google-api-key

# CORS
ALLOWED_ORIGINS=http://localhost:9002,https://your-domain.com
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4001
```

---

## Apêndice B: Tabelas do Banco de Dados

### users

| Coluna               | Tipo    | Descrição                  |
| -------------------- | ------- | -------------------------- |
| id                   | UUID    | ID único                   |
| tenant_id            | UUID    | FK para tenants            |
| email                | VARCHAR | Email único                |
| role                 | VARCHAR | admin/collaborator/cliente |
| zabbix_hostgroup_ids | TEXT[]  | IDs dos grupos Zabbix      |

### automation_rules

| Coluna             | Tipo    | Descrição       |
| ------------------ | ------- | --------------- |
| id                 | UUID    | ID único        |
| tenant_id          | UUID    | FK para tenants |
| name               | TEXT    | Nome da regra   |
| trigger_type       | TEXT    | Tipo de trigger |
| trigger_conditions | JSONB   | Condições       |
| action_type        | TEXT    | Tipo de ação    |
| is_enabled         | BOOLEAN | Ativa/desativa  |

### automation_logs

| Coluna      | Tipo      | Descrição       |
| ----------- | --------- | --------------- |
| id          | UUID      | ID único        |
| rule_id     | UUID      | FK para regra   |
| tenant_id   | UUID      | FK para tenant  |
| status      | TEXT      | success/failure |
| message     | TEXT      | Detalhes        |
| executed_at | TIMESTAMP | Data execução   |

---

## Próximos Passos

1. [ ] Configurar instância n8n
2. [ ] Criar credenciais da API
3. [ ] Implementar workflow de autenticação
4. [ ] Criar primeiro agente de diagnóstico
5. [ ] Testar com alertas reais
6. [ ] Integrar com chat (Slack/Teams/WhatsApp)

---

_Documentação criada em Janeiro/2026 - NOC AI v1.0_
