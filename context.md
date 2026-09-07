# Contexto

Quero desenvolver o MVP de um **aplicativo desktop de produtividade e gerenciamento rápido de tarefas**, inicialmente para **macOS**, mas cuja arquitetura permita suporte ao Windows posteriormente.

O aplicativo deve permanecer discreto durante o uso, funcionando através de uma **aba grudada na lateral da tela**. Ao clicar na aba, ela se expande abrindo a interface com acesso rápido às tarefas.

O objetivo do produto é:

> Permitir que o usuário organize as tarefas que pretende executar no dia e realize ações comuns sem precisar abrir constantemente ferramentas externas de gerenciamento de projetos.

O aplicativo **não deve ser construído como um cliente específico do ClickUp**.

O ClickUp será apenas a primeira integração. A arquitetura deve permitir que futuramente sejam adicionados outros providers como Jira, Linear, Trello, GitHub Issues etc.

O conceito central do produto é o **Meu Dia (My Day)**.

---

# Stack desejada

Analise as decisões antes da implementação, mas dê preferência para:

* Tauri;
* React;
* TypeScript;
* SQLite;
* armazenamento seguro das credenciais utilizando recursos nativos do sistema operacional.

Evite adicionar backend próprio ao MVP.

O aplicativo deve funcionar de forma **local-first**.

Não implementar neste momento:

* cadastro de usuário;
* login próprio;
* servidor/backend;
* PostgreSQL;
* Redis;
* WebSocket;
* microsserviços;
* sincronização em nuvem.

Toda informação específica do aplicativo deverá ser armazenada localmente.

Credenciais e tokens de APIs externas **não devem ser armazenados em texto puro no SQLite**.

---

# 1. Comportamento do aplicativo

O aplicativo deverá funcionar com uma aba discreta grudada na lateral da tela.

Ao iniciar:

1. carregar as configurações locais;
2. verificar as integrações configuradas;
3. carregar imediatamente os dados locais/cache;
4. sincronizar as tarefas externas em segundo plano;
5. permanecer disponível e recolhido na aba lateral da tela.

Ao clicar na aba lateral, expandir a interface compacta.

A experiência deve seguir o princípio:

**abrir → visualizar → agir → fechar.**

Evite interfaces que obriguem o usuário a navegar por várias telas para executar ações simples.

---

# 2. Integrações

O MVP terá inicialmente apenas:

**ClickUp**

O usuário deverá conseguir informar seu token/credencial e conectar sua conta.

Após a conexão, buscar as informações necessárias da conta do ClickUp e permitir configurar quais fontes serão consideradas pelo aplicativo.

Dependendo das possibilidades da API do ClickUp, permita selecionar workspace, spaces, folders e/ou lists relevantes.

A integração deverá ser desacoplada do restante da aplicação.

Crie uma abstração semelhante conceitualmente a:

`TaskProvider`

Ela deverá representar operações como:

* listar tarefas;
* obter detalhes;
* criar tarefa;
* alterar status;
* adicionar comentário.

A implementação inicial será:

`ClickUpProvider`

Não espalhe regras específicas do ClickUp pelo restante do projeto.

---

# 3. Sincronização de tarefas

Após configurar o ClickUp, o aplicativo deverá buscar as tarefas pendentes relevantes para o usuário.

As tarefas deverão ser armazenadas/cacheadas localmente para que a interface não dependa de uma chamada à API toda vez que for aberta.

A abertura da interface deve priorizar os dados locais e realizar sincronizações em segundo plano.

Deve existir também uma ação:

**Sincronizar agora**

O aplicativo deverá armazenar quando ocorreu a última sincronização.

---

# 4. Meu Dia

Essa é a principal funcionalidade do MVP.

O usuário deverá conseguir visualizar suas tarefas pendentes e selecionar quais pretende executar naquele dia.

Exemplo:

Todas as tarefas:

* [ ] Implementar autenticação
* [ ] Corrigir formulário
* [ ] Revisar Pull Request
* [ ] Atualizar documentação
* [ ] Criar página do cliente

O usuário seleciona algumas e executa:

**Adicionar ao Meu Dia**

Essas tarefas passam a fazer parte do planejamento local daquele dia.

Exemplo:

## Meu Dia

1. Implementar autenticação
2. Corrigir formulário
3. Revisar Pull Request

Essa associação é uma informação **local do aplicativo**.

Adicionar uma tarefa ao Meu Dia NÃO deve modificar automaticamente a tarefa no ClickUp.

O planejamento deve ser armazenado por data para que posteriormente seja possível implementar histórico.

---

# 5. Interface principal

Ao clicar na aba lateral para expandir, priorizar a visualização:

**Meu Dia**

Exibir as tarefas escolhidas para o dia atual.

Cada item deve mostrar pelo menos:

* título;
* status;
* origem;
* prazo, quando existir.

Permitir clicar na tarefa para visualizar suas ações rápidas.

Também deve existir acesso rápido para:

* adicionar tarefa ao Meu Dia;
* criar tarefa;
* sincronizar;
* configurações.

A interface deve ser compacta e adequada para um painel lateral retrátil.

---

# 6. Todas as tarefas

Criar uma visualização onde o usuário possa consultar as tarefas pendentes sincronizadas.

Permitir:

* visualizar tarefas;
* pesquisar pelo título;
* selecionar múltiplas tarefas;
* adicionar selecionadas ao Meu Dia.

Quando possível, permitir agrupamento simples pela estrutura existente no ClickUp, como lista/projeto.

Não criar filtros excessivamente complexos no MVP.

---

# 7. Detalhes e ações rápidas

Ao clicar em uma tarefa, mostrar suas principais informações.

Exibir, quando disponíveis:

* título;
* descrição;
* status;
* prazo;
* lista/projeto;
* origem.

Permitir:

### Alterar status

Exibir os status disponíveis na origem da tarefa e permitir alteração.

A mudança deverá ser enviada ao ClickUp e refletida no cache local.

### Adicionar comentário

Permitir escrever e enviar um comentário para a tarefa.

### Abrir externamente

Adicionar:

**Abrir no ClickUp**

Essa ação deverá abrir a URL original da tarefa no navegador.

### Meu Dia

Permitir:

* adicionar ao Meu Dia;
* remover do Meu Dia.

---

# 8. Criação de tarefas

Adicionar criação rápida de tarefas.

No MVP, permitir criar uma tarefa diretamente no ClickUp.

Solicitar somente os campos realmente necessários, como:

* título;
* descrição opcional;
* destino/lista;
* prazo opcional.

Após a criação:

1. enviar para o ClickUp;
2. atualizar o cache local;
3. disponibilizar imediatamente a tarefa no aplicativo.

Prepare o domínio para futuramente suportar tarefas puramente locais, mas não é obrigatório implementar tarefas locais nesta primeira versão se isso aumentar significativamente o escopo.

---

# 9. Persistência local

Utilizar SQLite para informações locais.

Precisamos armazenar pelo menos:

### Integrações

* provider;
* configurações não sensíveis;
* ativo/inativo;
* última sincronização.

### Cache das tarefas

Guardar informações suficientes para renderizar rapidamente as tarefas sem consultar constantemente a API externa.

### Daily Plans

Representar o planejamento de cada dia.

### Daily Plan Items

Relacionar tarefas externas ao planejamento diário.

### Configurações

Preferências locais do aplicativo.

Não armazene tokens ou segredos diretamente no banco.

Utilize armazenamento seguro apropriado do sistema operacional.

---

# 10. Estado local x estado externo

Mantenha clara a diferença entre:

**Estado da tarefa**

e

**Estado do planejamento diário.**

Exemplo:

Uma tarefa pode estar:

`IN PROGRESS`

no ClickUp e, ao mesmo tempo, ter sido marcada como executada no planejamento diário.

Não presuma automaticamente que concluir algo no Meu Dia significa alterar o status externo.

Para o MVP, deixe essas duas operações explicitamente separadas.

---

# 11. Configurações

Criar uma área simples de configurações.

Permitir inicialmente:

* configurar integração ClickUp;
* selecionar fontes/listas sincronizadas;
* visualizar estado da conexão;
* desconectar integração;
* sincronizar manualmente;
* configurar inicialização automática junto ao macOS, se suportado de maneira adequada pelo Tauri.

---

# 12. Estados de interface

Trate corretamente pelo menos:

* primeira utilização;
* nenhuma integração configurada;
* token inválido;
* sem internet;
* API indisponível;
* sincronização em andamento;
* nenhuma tarefa encontrada;
* nenhuma tarefa selecionada para hoje;
* erro ao atualizar tarefa;
* erro ao enviar comentário.

O aplicativo não deve ficar inutilizável simplesmente porque o ClickUp está temporariamente indisponível.

Quando possível, continue mostrando os dados existentes no cache local.

---

# 13. Fora do MVP

NÃO implementar agora:

* conta própria;
* autenticação própria;
* backend;
* sincronização entre computadores;
* aplicativo mobile;
* equipes;
* planos pagos;
* assinatura;
* analytics;
* colaboração entre usuários;
* Jira;
* Linear;
* Trello;
* GitHub;
* notificações complexas;
* IA;
* calendário;
* controle de tempo;
* Pomodoro.

Podemos adicionar esses recursos posteriormente.

---

# Fluxo esperado do MVP

## Primeira utilização

Usuário instala o aplicativo.

→ aba do aplicativo aparece fixada na lateral da tela
→ nenhuma integração configurada
→ usuário abre Configurações
→ adiciona ClickUp
→ informa credencial
→ aplicativo valida credencial
→ usuário seleciona as fontes/listas desejadas
→ primeira sincronização ocorre
→ tarefas são armazenadas localmente.

## Início do dia

Usuário abre o aplicativo.

→ Meu Dia está vazio
→ seleciona "Adicionar tarefas"
→ aplicativo mostra tarefas pendentes
→ usuário seleciona as que pretende executar
→ adiciona ao Meu Dia.

## Durante o trabalho

Usuário abre rapidamente o aplicativo.

→ visualiza Meu Dia
→ abre uma tarefa
→ altera status para "In Progress"
→ alteração é enviada ao ClickUp
→ fecha o aplicativo.

Posteriormente:

→ abre novamente
→ seleciona tarefa
→ adiciona comentário
→ comentário é enviado ao ClickUp.

Tudo sem precisar abrir a interface completa do ClickUp.

---

# Diretrizes de UX

O produto deve parecer uma **ferramenta desktop nativa e discreta**, não um website colocado dentro de uma janela.

Priorize:

* interface minimalista;
* abertura rápida;
* poucas ações por tela;
* feedback imediato;
* navegação por teclado quando possível;
* tamanho compacto;
* integração visual adequada com macOS;
* suporte a modo claro/escuro;
* loading discreto;
* mensagens de erro úteis;
* funcionamento rápido mesmo durante sincronizações.

A interface lateral retrátil não deve se transformar em um dashboard grande.

Quando alguma operação realmente exigir mais espaço, pode ser utilizada uma janela secundária.

---

# Arquitetura

Antes de implementar, proponha uma arquitetura simples para o MVP.

Evite overengineering.

Precisamos principalmente separar:

1. UI;
2. regras do aplicativo;
3. persistência local;
4. sincronização;
5. providers externos;
6. integração nativa com o sistema operacional.

A aplicação não deve depender diretamente do ClickUp fora da camada responsável pela integração.

---

# Estratégia de implementação

Não tente implementar tudo de uma vez.

Primeiro analise este escopo e crie um plano incremental.

Sugestão:

### Etapa 1

Base Tauri + React + TypeScript e funcionamento como aba lateral retrátil.

### Etapa 2

SQLite e persistência local.

### Etapa 3

Configuração e autenticação com ClickUp.

### Etapa 4

Sincronização e cache das tarefas.

### Etapa 5

Tela Todas as Tarefas.

### Etapa 6

Meu Dia.

### Etapa 7

Detalhes e alteração de status.

### Etapa 8

Comentários.

### Etapa 9

Criação rápida de tarefas.

### Etapa 10

Tratamento offline, erros, refinamentos de UX e testes.

Antes de iniciar a implementação, apresente:

* arquitetura proposta;
* principais entidades;
* modelo inicial do banco SQLite;
* fluxo de dados;
* estratégia de integração com ClickUp;
* estratégia de armazenamento seguro do token;
* estrutura geral das telas;
* bibliotecas adicionais que pretende utilizar e justificativa;
* divisão das etapas de desenvolvimento.

Depois disso, inicie a implementação pela **Etapa 1**, mantendo o projeto executável ao final de cada etapa.

Não avance criando funcionalidades futuras que não fazem parte do MVP sem necessidade.
