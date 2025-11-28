# NOC AI - Acompanhamento do Projeto

Este documento resume o progresso, as funcionalidades entregues e o roadmap evolutivo da plataforma NOC AI.

## Resumo Geral do Progresso

O MVP (Minimum Viable Product) teve suas funcionalidades principais implementadas com sucesso. A plataforma está em fase de estabilização, com foco em testes de ponta a ponta nos fluxos de automação e na robustez das integrações em um ambiente que simula produção.

**Status Geral:** Funcionalidades do MVP 100% implementadas; em fase de testes e refinamento.

---

## Status Detalhado por Sprint

-   **✅ Sprint 1 - Setup Inicial e Autenticação (100% concluída)**
    -   **Entregues:** Base do projeto frontend (Next.js), layout responsivo com dark mode, deploy na Vercel, e fluxo de autenticação seguro.

-   **✅ Sprint 2 - Estrutura de Painel e Multi-Tenant (100% concluída)**
    -   **Entregues:** Layout principal com sidebar, middleware de proteção de rotas, e estrutura de dados multi-tenant no banco de dados.

-   **✅ Sprint 3 - Integração Zabbix (100% concluída)**
    -   **Entregues:** Conector funcional com a API do Zabbix, importação de alertas e hosts, e filtros de visualização por data, severidade e grupo de hosts. A visibilidade é corretamente segregada por tenant.

-   **✅ Sprint 4 - Execução Remota de Comandos (100% concluída)**
    -   **Entregues:** Arquitetura de microsserviço Python (Netmiko) para execução de comandos SSH. O fluxo Frontend → Backend → Microsserviço está funcional, permitindo a execução de diagnósticos em dispositivos de rede.

-   **✅ Sprint 5 - Motor de Automação (100% concluída)**
    -   **Entregues:** Implementação de um motor de automação avançado baseado em templates, que utiliza IA para associar alertas a scripts de diagnóstico. O sistema captura eventos do Zabbix, identifica o tenant, seleciona o template apropriado e executa os comandos no dispositivo correto.

-   **🟡 Sprint 6-10 (Em andamento e Replanejamento)**
    -   A fase atual foca em **QA e Hardening** (Sprint 9), com a validação do fluxo completo de automação e a implementação de dashboards e logs (Sprints 6 e 7).

---

## Funcionalidades Entregues

#### **Dashboard de Monitoramento Unificado**

-   **O que faz:** Exibe alertas do Zabbix em tempo real, com filtros dinâmicos por período, severidade, grupo de hosts e dispositivo específico.
-   **Status:** **Concluído**.

#### **Diagnóstico com IA (Agente de Rede Virtual)**

-   **O que faz:** Permite que o usuário descreva um problema em linguagem natural (ex: "ping para google.com a partir do meu roteador de SP"). A IA interpreta o pedido, escolhe a ferramenta correta (ping, traceroute, ou comandos de dispositivo) e a executa para fornecer um diagnóstico.
-   **Status:** **Concluído**.

#### **Automação Baseada em Templates (IA-Driven)**

-   **O que faz:** O administrador cria "Templates de Automação" (ex: um script para diagnosticar CPU alta). O cliente simplesmente "ativa" os templates que deseja usar. Quando um alerta correspondente chega do Zabbix, a IA identifica o melhor template e executa o script automaticamente no dispositivo afetado, registrando tudo em um log de auditoria.
-   **Status:** **Concluído**.

#### **Gerenciamento de Credenciais Seguras**

-   **O que faz:** Permite o cadastro seguro de credenciais SSH para os dispositivos de rede. As senhas são criptografadas no banco de dados, garantindo que apenas o serviço de automação possa usá-las para se conectar aos equipamentos.
-   **Status:** **Concluído**.

#### **Listas de Bloqueio de DNS (Threat Intelligence Feeds)**

-   **O que faz:** O administrador pode criar e gerenciar listas de domínios maliciosos. Os clientes podem se "inscrever" nessas listas para receber proteção automática, além de poderem adicionar seus próprios domínios manualmente.
-   **Status:** **Concluído**.

---

## 📋 Roadmap - Evolução NOC AI

| Feature                                | Benefício Prático                                | Tasks                                                               | Prioridade | % Progresso | Próximos Passos                                                   |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ---------- | ----------- | ----------------------------------------------------------------- |
| **Cadastro de usuários e permissões**  | Controle de acesso granular e seguro.            | Adicionar usuários, grupos, e associar a tenants.                   | 1          | **100%**    | Funcionalidade concluída.                                         |
| **Cadastro de dispositivos**           | Centralizar a configuração dos equipamentos.     | Cadastro de IP, porta SSH, tipo de dispositivo (Netmiko).           | 2          | **100%**    | Funcionalidade concluída.                                         |
| **Consultas a BGP**                    | Diagnóstico rápido de peers e rotas.             | Criar template de automação para comandos BGP (`show ip bgp summary`). | 3          | **75%**     | A automação executa o comando. Falta camada de IA para interpretar a saída. |
| **Testes de conectividade**            | Isolar problemas de rede rapidamente.            | Criar template para `ping` e `traceroute`.                          | 4          | **100%**    | Funcionalidade concluída através do Agente de IA.                 |
| **Métricas avançadas (Insights)**      | Detecção proativa de falhas.                    | Analisar interfaces com erros/discards em múltiplos dispositivos.   | 4          | **25%**     | A base de coleta de métricas existe. Falta UI e lógica de insights.   |
| **Monitoramento de saúde do dispositivo**| Prevenção de falhas e análise de causa raiz.     | Gráficos de CPU, memória, e listagem de alarmes ativos.             | 5          | **90%**     | Implementado na página de detalhes do dispositivo. Falta validação. |
| **Estatísticas de uso e custo**        | Monitorar e otimizar o uso da plataforma.        | Gráficos de execuções de automação e chamadas de IA.                | 5          | **50%**     | Logs de execução de regras estão sendo gerados. Falta dashboard.      |
| **Visibilidade de VLANs e switches**   | Mapeamento e diagnóstico da rede local.          | Criar template para `show vlan brief`.                              | 5          | **75%**     | O motor de automação está pronto. Basta criar o template específico. |
| **Suporte a BNG (usuários finais)**    | Agilizar o suporte a clientes residenciais.     | Consultar status de um usuário PPPoE no BNG.                        | 5          | **0%**      | Não implementado.                                                 |
| **Memória e personalização da IA**     | Aumentar a assertividade e naturalidade da IA.   | "Sempre que eu falar 'peer', entenda 'BGP'".                        | 5          | **0%**      | Não implementado.                                                 |
