# DailyFlow ⚡

> **Seu fluxo de trabalho diário sem atrito.**  
> Um aplicativo desktop nativo para macOS no formato de **aba lateral retrátil**, projetado para transformar a gestão de tarefas corporativas em um planejamento diário focado, direto e sem distrações.

---

## 🎯 Descrição — O que o DailyFlow resolve para você?

Ferramentas corporativas de gestão de projetos (como ClickUp, Jira ou Linear) são excelentes para organizar equipes inteiras, mas são **pesadas, lentas e cheias de ruído visual** para o seu foco diário. 

Abrir o navegador, carregar dezenas de abas pesadas, navegar por dezenas de listas e ser bombardeado por tarefas de outros membros gera sobrecarga cognitiva e perda de tempo.

### O que o DailyFlow faz por você:
1. **Foco Total no "Meu Dia":** Em vez de olhar para centenas de tarefas espalhadas, você seleciona o que realmente importa para o seu dia e acompanha seu progresso em uma lista limpa e minimalista.
2. **Aba Lateral Retrátil (Edge Drawer):** Fica discretamente fixada na borda da sua tela. Basta um clique na aba ou um atalho de teclado para abrir o painel instantaneamente, marcar um item ou mudar um status, e recolher sem interromper o que você está fazendo.
3. **Filtragem Cirúrgica em 4 Etapas:**
   - 🏢 **Workspaces:** Selecione apenas os workspaces que você atua.
   - 📁 **Listas:** Escolha apenas as listas, espaços ou pastas relevantes.
   - 👤 **Responsável:** Filtre apenas as tarefas atribuídas a **você (Usuário X)** ou a membros específicos.
   - 🏷️ **Status:** Escolha exatamente quais status você quer monitorar (ex: *Apenas tarefas abertas e em andamento*).
4. **Offline-First & Ultra Rápido:** Todas as tarefas ficam salvas localmente no seu computador em SQLite. A inicialização é instantânea (milissegundos), e a sincronização com a nuvem ocorre em segundo plano com consultas paralelas otimizadas.
5. **Ações Rápidas sem Abrir o Navegador:** Mude status, comente em tarefas, adicione ao seu dia ou crie novas tarefas diretamente pela gaveta lateral.

---

## 🛠️ Ferramentas & Tecnologias

O DailyFlow foi arquitetado com as tecnologias mais modernas do ecossistema de desenvolvimento desktop, priorizando **desempenho nativo, consumo mínimo de memória RAM e segurança absoluta**.

| Ferramenta / Tecnologia | Onde é utilizada? | Para que serve? | Por que foi escolhida? |
| :--- | :--- | :--- | :--- |
| **Tauri v2 (Rust)** | Backend nativo do app (`src-tauri/`) | Comunicação com o sistema operacional macOS, controle de janelas, gerenciamento de processos e segurança. | Substitui o Electron consumindo até **90% menos memória RAM**, tempo de inicialização instantâneo e binário compacto. |
| **React 19 + TypeScript** | Frontend da aplicação (`src/`) | Interface do usuário reativa, controle de abas, formulários e lógica de apresentação. | Tipagem estrita ponta a ponta, renderização fluida e ecossistema robusto de componentes. |
| **Vite** | Bundler e ambiente de desenvolvimento | Compilação e Hot Module Replacement (HMR) em milissegundos. | Velocidade absurda de build e desenvolvimento sem overhead. |
| **Tailwind CSS v4** | Estilização da interface | Design system dark minimalista, efeitos de glassmorphism (*frosted glass*) e micro-animações. | Interface moderna com classes utilitárias sem sobrecarregar o CSS final. |
| **SQLite (`tauri-plugin-sql`)** | Banco de dados local (`dailyflow.db`) | Armazenamento de cache das tarefas, planos do "Meu Dia", configurações e histórico. | Permite funcionamento **100% offline-first**, persistência local instantânea e zero dependência de servidores intermediários. |
| **macOS Keychain (`keyring` Rust crate)** | Armazenamento seguro de credenciais | Salvar os Tokens de API (ClickUp Personal Access Token). | Segurança de nível bancário nativa do macOS — nenhum token fica salvo em texto puro no disco. |
| **macOS Private APIs & Window Positioning** | Rust / App Lifecycle | Efeito de aba retrátil fixada na borda do monitor com transparência e cantos arredondados nativos. | Garante que o drawer deslize na borda da tela sem bordas brancas ou artefatos visuais. |
| **Zustand** | Gerenciamento de estado global | Controle das tarefas ativas, filtros, modais e estado expandido/recolhido da gaveta. | Store minimalista, sem boilerplate e com excelente desempenho para re-renderizações pontuais. |
| **Lucide React** | Ícones da aplicação | Identidade visual de status, listas, workspaces, usuários e ações rápidas. | Ícones vetoriais modernos, limpos e consistentes. |

---

## 🏗️ Arquitetura do Projeto

```
dailyflow/
├── public/                 # Favicons e assets estáticos
├── src/
│   ├── components/         # Componentes visuais da interface
│   │   ├── Header.tsx             # Topo com data, atalhos de sincronização e tabs
│   │   ├── DrawerHandle.tsx       # Aba lateral retrátil na borda da tela
│   │   ├── MyDayView.tsx          # Visão central focada no dia atual
│   │   ├── AllTasksView.tsx       # Visão hierárquica (Workspace › Espaço › Pasta › Lista)
│   │   ├── TaskDetailModal.tsx    # Modal de detalhes, comentários e mudança de status
│   │   ├── QuickCreateTaskModal.tsx # Criação rápida de tarefas
│   │   └── SettingsView.tsx       # Wizard de sincronização em 4 etapas e preferências
│   ├── providers/          # Abstração de provedores de tarefas (ITaskProvider)
│   │   ├── TaskProvider.ts        # Interfaces abstratas
│   │   ├── ProviderFactory.ts     # Fábrica de provedores
│   │   └── clickup/               # Implementação oficial do ClickUp
│   ├── services/           # Camada de serviços e repositórios locais
│   │   ├── db.ts                  # Conexão SQLite nativa
│   │   ├── keychain.ts            # Acesso ao Keychain do macOS
│   │   ├── syncService.ts         # Orquestrador de sincronização em segundo plano
│   │   ├── taskRepository.ts      # Repositório SQLite de tarefas
│   │   ├── dailyPlanRepository.ts # Repositório SQLite do Meu Dia
│   │   └── settingsRepository.ts  # Persistência de configurações e preferências
│   ├── store/              # Estado global da aplicação (Zustand)
│   └── types/              # Definições de tipos TypeScript
└── src-tauri/              # Backend nativo em Rust
    ├── src/
    │   ├── lib.rs                 # Comandos Tauri (Keychain, Drawer Resize, Migrações SQLite)
    │   └── main.rs                # Entrypoint nativo
    ├── icons/                     # Ícones oficiais nos formatos macOS (.icns), Windows (.ico) e PNG
    ├── tauri.conf.json            # Configurações de compilação, janela e bundle
    └── Cargo.toml                 # Dependências Rust
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos:
- **Node.js** (v18+)
- **Rust** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **macOS** (compatível com Apple Silicon M1/M2/M3/M4 e Intel)

### Instalação:
```bash
# 1. Clonar o repositório
git clone https://github.com/inextapps/dailyflow.git
cd dailyflow

# 2. Instalar as dependências do frontend
npm install

# 3. Rodar em modo de desenvolvimento (Hot Reload)
source "$HOME/.cargo/env"
npm run tauri dev
```

### Gerar Instaladores Localmente:
```bash
# macOS (.dmg e .app):
npm run tauri build

# Windows (.exe e .msi - executar em ambiente Windows):
npm run tauri build
```

### 📦 Builds Automáticos para Mac e Windows (GitHub Actions):
O projeto já conta com CI/CD configurado em `.github/workflows/release.yml`. Para gerar uma nova versão com download automático de `.dmg` (Mac) e `.exe` (Windows):
```bash
git tag v0.1.0
git push origin v0.1.0
```
*(Ou acione manualmente pela aba **Actions > Release DailyFlow** no seu GitHub).*

---

## 🔮 Futuras Features (Roadmap)

- [ ] **Novos Provedores de Tarefas:**
  - Suporte nativo para **Linear**, **Jira**, **Notion Databases**, **GitHub Issues** e **Asana**.
- [ ] **Timer Pomodoro Integrado:**
  - Timer visual embutido no drawer com contagem regressiva e som discreto de finalização.
  - Associação do tempo gasto diretamente na tarefa do provedor.
- [ ] **Personalização do Atalho Global:**
  - Seletor de combinações de teclas customizadas nas configurações (ex: `Cmd+Space`, `Ctrl+Option+D`).
- [ ] **Ícone na Barra de Menus (Tray Companion):**
  - Acesso rápido aos itens do Meu Dia diretamente pelo menu bar do macOS.
- [ ] **Sugestões Inteligentes de Planejamento Diário:**
  - Algoritmo que sugere tarefas prioritárias baseado em datas de entrega (*due dates*), atrasos e relevância.
- [ ] **Relatórios & Analytics Semanais:**
  - Resumo de produtividade da semana: quantidade de tarefas concluídas, tempo de foco e distribuição por listas.
- [ ] **Subtarefas e Checklist Interativo:**
  - Marcação e expansão de subtarefas diretamente pelo painel de detalhes do DailyFlow.

