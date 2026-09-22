# DailyFlow

Aplicativo desktop com painel lateral retrátil para planejar o dia e executar ações rápidas no ClickUp.

## Funcionalidades

- **Meu Dia:** planejamento por data local, conclusão local independente do ClickUp e reordenação persistida com botões de subir/descer.
- **Tarefas:** pesquisa, agrupamento por origem e seleção em lote para o Meu Dia.
- **Configuração em quatro etapas:** Workspaces → Listas → Responsável → Status, após a validação do token.
- **Ações remotas:** criar tarefa, mudar status e enviar comentário. Essas operações exigem conexão; falhas não são apresentadas como sucesso nem criam tarefas fictícias.
- **Automação opcional:** atualizar status e enviar comentário com menção. Vem desativada; o status escolhido precisa existir na lista da tarefa. Falhas parciais são informadas.
- **Sincronização:** ao iniciar, recuperar foco e a cada minuto, com paginação e preservação dos dados visíveis em caso de falha de consulta. O histórico do Meu Dia permanece no cache mesmo quando uma tarefa sai dos filtros.
- **Integração desktop:** inicia recolhido, recolhe ao perder foco, oferece inicialização com o sistema e atalho global `Cmd+Shift+D` no macOS / `Ctrl+Shift+D` no Windows.

## Dados e segurança

SQLite armazena tarefas, metadados de origem, responsáveis, planos diários e configurações. O token usa o Keychain do macOS ou o cofre de credenciais do Windows. Tokens de versões antigas existentes no `localStorage` são migrados para o cofre e removidos do armazenamento antigo após sucesso.

O cache permite consultar tarefas e organizar o Meu Dia offline. Não existe fila de reenvio de alterações remotas. Se uma operação ficar sem confirmação, confira o ClickUp antes de reenviar, especialmente comentários e criação de tarefas.

## Desenvolvimento

Requisitos: Node.js **22.13+**, Rust estável e os [pré-requisitos nativos do Tauri](https://v2.tauri.app/start/prerequisites/) para macOS ou Windows.

```bash
git clone https://github.com/icaroteodoro/dailyflowapp.git
cd dailyflowapp
npm ci
npm run tauri dev
```

`npm run dev` inicia apenas a interface no navegador; SQLite, credenciais e preferências do sistema exigem execução pelo Tauri.

```bash
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Os testes usam Vitest, respostas HTTP simuladas e SQLite em memória para verificar regressões de paginação, persistência, datas e credenciais. Não substituem testes manuais com uma conta real e com as janelas/cofres nativos de cada sistema.

## Arquitetura

- `src/components`: interface React/TypeScript, tema escuro.
- `src/store`: estado global e ações com Zustand.
- `src/services`: persistência, credenciais, sincronização e automações.
- `src/providers`: contrato de integração e implementação ClickUp.
- `src-tauri`: comandos Rust, migração SQLite, janela e plugins nativos.
- `tests`: testes de regressão.

## Distribuição

O workflow `.github/workflows/release.yml` gera instaladores para macOS Apple Silicon, macOS Intel e Windows x64. Para publicar, crie uma tag correspondente à versão em `package.json`, `Cargo.toml` e `tauri.conf.json` e envie-a ao repositório. Também é possível executar o workflow manualmente informando a tag.

## Próximas melhorias

Tema claro, personalização da combinação do atalho, timer/Pomodoro, subtarefas, relatórios e novos provedores. Essas funcionalidades ainda não estão implementadas.
