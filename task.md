# Roadmap & Tarefas - DailyFlow (MVP)

Acompanhamento do desenvolvimento do aplicativo desktop de produtividade diária (DailyFlow) com aba lateral retrátil e integração ClickUp.

---

## 📌 Status Geral do Projeto
- [x] **Fase 0: Planejamento & Arquitetura**
- [x] **Etapa 1: Base Tauri + React + Aba Lateral Retrátil**
- [x] **Etapa 2: Persistência Local (SQLite) & Armazenamento Seguro**
- [x] **Etapa 3: Abstração TaskProvider & Integração ClickUp**
- [x] **Etapa 4: Sincronização & Cache de Tarefas**
- [x] **Etapa 5: Interface "Todas as Tarefas"**
- [x] **Etapa 6: Funcionalidade "Meu Dia"**
- [x] **Etapa 7: Detalhes da Tarefa & Mudança de Status**
- [x] **Etapa 8: Comentários Rápidos**
- [x] **Etapa 9: Criação Rápida de Tarefas**
- [x] **Etapa 10: Tratamento Offline, UX, Erros & Validação**

---

## 📐 Fase 0: Planejamento & Arquitetura
- [x] Definir a arquitetura da aplicação (separação UI, Providers, Cache, Database e Segurança).
- [x] Modelar o schema inicial do SQLite (`integrations`, `tasks_cache`, `daily_plans`, `daily_plan_items`, `settings`).
- [x] Definir a estratégia para fixação da janela como aba lateral retrátil no macOS/desktop (Tauri window positioning/drawer).
- [x] Definir a estratégia de segurança para credenciais e tokens (Keychain/OS Keyring nativo).
- [x] Definir a biblioteca de componentes e design system minimalista (tema claro/escuro).

---

## 🚀 Etapa 1: Base do Projeto & Aba Lateral Retrátil
- [x] Inicializar projeto Tauri (v2) + React + TypeScript + Vite.
- [x] Configurar layout base da janela do Tauri para comportamento de aba/drawer:
  - [x] Aba discreta fixada na borda lateral da tela.
  - [x] Mecanismo de clique na aba para expandir o painel.
  - [x] Mecanismo para recolher o painel ao clicar fora ou na aba.
  - [x] Suporte a atalhos de teclado para abrir/fechar.
- [x] Configurar design system base (Dark/Light mode, tipografia, micro-animações suaves).
- [x] Estruturar navegação interna (Meu Dia, Todas as Tarefas, Configurações).

---

## 🗄️ Etapa 2: Persistência Local & Armazenamento Seguro
- [x] Integrar SQLite via Tauri/Rust (`tauri-plugin-sql` ou backend Rust).
- [x] Criar migrações iniciais para as tabelas:
  - [x] `integrations` (provedor, configs públicas, data de sync, status).
  - [x] `tasks_cache` (id externo, título, descrição, status, prazo, projeto/lista, provider).
  - [x] `daily_plans` (id, data `YYYY-MM-DD`, metadata).
  - [x] `daily_plan_items` (daily_plan_id, task_id, ordem, concluído localmente).
  - [x] `settings` (preferências do app, inicialização com o sistema).
- [x] Integrar plugin/serviço de cofre nativo de senhas (Keychain no macOS) para tokens de API.
- [x] Criar camada de repositório e serviços locais no frontend.

---

## 🔌 Etapa 3: Abstração de Provedores & Integração ClickUp
- [x] Criar interface abstrata `TaskProvider`:
  - [x] `authenticate(credentials): Promise<boolean>`
  - [x] `getWorkspaces(): Promise<Workspace[]>`
  - [x] `getSources(): Promise<Source[]>` (spaces, folders, lists)
  - [x] `fetchTasks(sourceIds: string[]): Promise<ExternalTask[]>`
  - [x] `updateTaskStatus(taskId: string, status: string): Promise<void>`
  - [x] `createComment(taskId: string, comment: string): Promise<void>`
  - [x] `createTask(data: CreateTaskDTO): Promise<ExternalTask>`
- [x] Implementar `ClickUpProvider` consumindo a API REST do ClickUp.
- [x] Criar tela de **Configurações**:
  - [x] Inserir e validar Personal Access Token do ClickUp.
  - [x] Selecionar múltiplos workspaces simultaneamente com marcar/desmarcar todos.
  - [x] Selecionar listas hierarquizadas por Workspace › Espaço › Pasta.
  - [x] Selecionar responsável (apenas minhas tarefas, membro específico X ou todos).
  - [x] Selecionar status desejados para filtragem estrita.
  - [x] Exibir status da conexão, workspaces sincronizados, responsável e opção de desconectar.

---

## 🔄 Etapa 4: Sincronização & Cache Local
- [x] Criar rotina de sincronização em segundo plano (background sync).
- [x] Criar botão/ação de **"Sincronizar Agora"** na interface com indicador de progresso discreto.
- [x] Atualizar o cache no SQLite e registrar timestamp da última sincronização.
- [x] Implementar estratégia de fallback: abrir a interface instantaneamente com dados do cache local (offline-first).

---

## 📋 Etapa 5: Interface "Todas as Tarefas"
- [x] Desenvolver visualização de tarefas sincronizadas.
- [x] Adicionar barra de busca instantânea por título da tarefa.
- [x] Implementar agrupamento simples por lista / projeto do ClickUp.
- [x] Adicionar seleção múltipla de tarefas (checkboxes).
- [x] Criar botão de ação em lote: **"Adicionar selecionadas ao Meu Dia"**.

---

## ☀️ Etapa 6: Funcionalidade Central "Meu Dia"
- [x] Desenvolver visualização principal focada no dia atual (`Meu Dia`).
- [x] Exibir itens planejados com:
  - [x] Título da tarefa.
  - [x] Status original.
  - [x] Origem/Lista.
  - [x] Prazo/Data de vencimento (se existir).
- [x] Permitir reordenar tarefas no dia (drag-and-drop ou botões de ordem).
- [x] Implementar checkbox de conclusão **local** no Meu Dia (sem alterar o ClickUp obrigatoriamente).
- [x] Permitir remover tarefa do Meu Dia.
- [x] Criar atalho direto para "Adicionar Tarefas" quando o Meu Dia estiver vazio.

---

## 🔍 Etapa 7: Detalhes da Tarefa & Ações Rápidas
- [x] Criar painel/drawer de detalhes da tarefa selecionada:
  - [x] Exibir título, descrição formatada, status atual, datas e lista de origem.
- [x] Implementar seletor para **Alterar Status**:
  - [x] Listar status disponíveis vindos do ClickUp.
  - [x] Atualizar imediatamente no ClickUp e sincronizar com o cache local.
- [x] Implementar botão de ação **"Abrir no ClickUp"** (abrir URL externa no navegador padrão).
- [x] Ações rápidas de adicionar/remover do Meu Dia direto do modal de detalhes.

---

## 💬 Etapa 8: Comentários Rápidos
- [x] Adicionar seção de comentários no painel de detalhes da tarefa.
- [x] Criar campo de entrada de texto para novo comentário.
- [x] Enviar comentário via `ClickUpProvider`.
- [x] Exibir feedback de sucesso/erro imediato e discreto.

---

## ➕ Etapa 9: Criação Rápida de Tarefas
- [x] Criar modal ou painel rápido de "Nova Tarefa".
- [x] Campos mínimos necessários:
  - [x] Título da tarefa (obrigatório).
  - [x] Destino/Lista (seletor entre as listas sincronizadas).
  - [x] Descrição (opcional).
  - [x] Prazo (opcional).
- [x] Enviar criação para o ClickUp e adicionar imediatamente ao cache local e/ou Meu Dia.

---

## 🛡️ Etapa 10: Tratamento Offline, Estados de UI, Refinamento & Testes
- [x] Implementar tratamento para todos os estados de interface:
  - [x] Primeira utilização (onboarding / conectar integração).
  - [x] Nenhuma integração configurada.
  - [x] Token inválido ou expirado.
  - [x] Sem conexão com a internet (modo offline graceful).
  - [x] Nenhuma tarefa encontrada / Meu Dia vazio.
  - [x] Falha ao atualizar status ou enviar comentário com retry/alerta não bloqueante.
- [x] Ajustar performance e fluidez da animação de expandir/recolher da aba lateral.
- [x] Testes manuais e unitários dos fluxos críticos (Providers, Cache, Daily Plan).
- [x] Validação de build final para distribuição desktop.
