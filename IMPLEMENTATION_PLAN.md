# Plano técnico de implementação do redesign BrainBoard

**Status:** primeiro corte integrado e validado por build de frontend/backend e smoke test no Compose local: frontend, imagens e GET `/api/dashboard/overview` respondem com sucesso. Instrumentação histórica, migrações e dados persistidos permanecem fora do corte até decisão de produto. A revisão visual no navegador com o usuário orientará os próximos ajustes.

**Revalidação operacional — 15/10/2026:** a evidência histórica acima não garante disponibilidade atual do banco. Nesta rodada `/api/health` respondeu 200, mas Root observou GET `/api/dashboard/overview` com período UTC válido retornar 500 por autenticação do banco; resposta 400 sem parâmetros é inconclusiva. Nenhuma migração, seed, leitura privada ou escrita de dados foi realizada. Frontend e backend passaram build após a rodada de estados de erro.

**Atualização operacional — 16/10/2026:** a falha de autenticação descrita acima foi resolvida antes desta revisão. Sem registrar credenciais ou dados identificáveis, foi confirmado `/api/health` 200 e `GET /api/projects` 200 com 3 projetos; Overview, Kanban, Foco, Calendário e Área acadêmica foram revisados com dados reais em Edge. Docker Engine permanece indisponível, mas o backend local atende as telas. A interface já tem uma Visão geral populada; a afirmação histórica de que o dashboard não existia descrevia o estado anterior. Uma correção agrupada de copy eliminou “Sprint semanal” onde o contrato comprova apenas marcação para Foco. Nenhum dado foi escrito e o redesign segue aberto para ciclos posteriores.

## Objetivo e limites

Transformar a entrada atual em um painel de progresso pessoal e aplicar a mesma linguagem a Projetos, Kanban, Foco/Sprint, Calendário, Área Acadêmica e modais. Entregar primeiro uma experiência funcional com dados atuais verificáveis e imagens originais locais. Ideias sem fonte ou persistência recebem cards “Em breve” sem gráficos, valores, links ou controles que pareçam ativos.

Não incluir na primeira entrega pontos, ranking, horas de produtividade inferidas, sequência diária, sincronização de relógio, evolução de personagem, mudança de stack nem cópia das marcas/personagens das imagens. Preservar CRUD, MCP, status, busca, calendário, tema e teclado ABNT2.

## Evidências técnicas atuais

| Evidência | Arquivos / estado | Consequência para o plano |
| --- | --- | --- |
| `PROJECTS` é a primeira tela e representa uma lista, não um dashboard | `frontend/src/App.tsx`, `frontend/src/types/index.ts` (`ActiveView`) | Acrescentar uma tela `OVERVIEW` sem reaproveitar `PROJECTS` como se fossem a mesma coisa. Manter Projetos como entrada de navegação independente. |
| O `DashboardOverview` atual só calcula tarefas recebidas no Kanban | `frontend/src/components/DashboardOverview.tsx`, `KanbanBoard.tsx`; a lista filtrada por busca vem de `App.tsx` | Preservar o resumo local, corrigir/rotular seu escopo e impedir que a busca contextual altere o KPI do projeto. Criar página agregadora separada. |
| Lista de projetos é pesada | `backend/src/modules/projects/services/project.service.ts` `listProjects()` inclui etapas, tarefas/subtarefas, logs e membros | Não chamar `/api/projects` repetidamente para preencher mini cards. Medir payload e custo; usar leitura existente uma vez no primeiro corte e otimizar antes de ampliar carga. |
| Listagem de tarefas não pagina e inclui relações | `task.service.ts` `listTasks()` faz `findMany`, inclui subtasks e stage; `/api/tasks` suporta `status`, `isSprintActive`, `hasDueDate`, `stageId`, `projectId` | Para a faixa de foco usar filtro `isSprintActive=true`, limitar itens apresentados e observar volume; não carregar toda a base só para calcular um gráfico. Planejar projeção agregada se o perfil justificar. |
| A entidade sprint datada e a flag de foco coexistem | `schema.prisma`: `Sprint(startDate,endDate,status)` e `Task.sprintId` coexistem com `Task.isSprintActive`; UI usa a flag | Chamar a faixa “Foco” até definir qual modelo é canônico. Não alegar janela semanal nem métricas da Sprint datada a partir da flag. |
| O calendário já agrega três tipos reais com intervalo | `backend/src/modules/calendar/calendar.service.ts`, `/api/calendar/events` | Reusar para compromissos e vencimentos num horizonte limitado. Corrigir o tipo TypeScript da projeção no frontend, que não inclui hoje `ACADEMIC_ASSIGNMENT`, embora backend e `calendar.types.ts` retornem esse tipo. |
| Não há fonte histórica de conclusão | `Task` tem status, `createdAt`, `updatedAt`, mas sem `completedAt`/log de mudança | `updatedAt` não pode virar data de conclusão. Métricas históricas ficam “Em breve” até haver eventos de status e regra de fuso. |
| Prisma não tem histórico de migrações versionadas no repo | `backend/prisma/` contém apenas `schema.prisma`; PostgreSQL declarado no schema | Antes de qualquer alteração de schema, determinar o estado real do banco e estabelecer baseline/migração aditiva segura. Não executar `db push`, reset ou migration nesta rodada de planejamento. |
| Movimento e teste automatizado ainda são parciais | Tailwind transition/animações locais; sem regra global de `prefers-reduced-motion`. Frontend tem apenas script `build`; backend `test` é placeholder | Definir motion tokens e modos reduzidos em toda a UI. Criar estratégia de verificação compatível com o repositório em vez de presumir suíte pronta. |

## Arquitetura de tela e estado

### Navegação e shell

Adicionar `OVERVIEW` a `ActiveView`, tornar Overview a primeira tela e incluir item “Visão geral” no `Navbar`. `PROJECTS` continua sendo a biblioteca de projetos. `BOARD` e `PROJECT_SPRINT` continuam ligados ao projeto selecionado; Sprint global, Calendário e Academia conservam suas rotas de estado atuais.

Manter o shell `Navbar` + `TopHeader` + viewport principal. Desktop mantém navegação lateral com áreas e projetos; mobile mantém o drawer existente, aprimorado com semântica de diálogo, fechamento com Escape, foco inicial/devolvido e ordem de tabulação. Preservar `useTheme`, preferência salva e botão de alternância. Busca permanece contextual e Ctrl/Cmd+K não pode interferir com composição/AltGraph.

### Dados da visão geral

Criar `DashboardOverviewPage.tsx` e separar estado dos blocos. O primeiro corte pode consultar APIs existentes, limitando a janela do calendário. Cada bloco tem loading, erro, vazio e atualização próprios; falha na agenda não deve esconder a lista de projetos. Evitar refetch em cascata e somar o polling de 3,5 s existente com novos intervalos.

Dados permitidos na primeira entrega:

- total e status de projetos retornados por `projectsApi.list()`;
- tarefas atuais marcadas para foco, usando `tasksApi.listAll({ isSprintActive: true })`, identificando projeto pelo `stage.projectId` e mapa da lista carregada;
- próximos compromissos e prazos, via `calendarApi.getEvents({ startDate, endDate, includeCompleted: false })`, incluindo atividades acadêmicas;
- contagens por status dentro do quadro de projeto, sempre com escopo do projeto explícito.

Não mostrar percentual global de conclusão, histórico semanal, horas, produtividade ou streak. Os cards “Produtividade”, “Sequência” e “Relógio” podem estar visíveis na visão geral com explicação curta e selo textual **Em breve**. Sem CTA falso nem placeholder que pareça dado carregando. Relógio local poderá ser uma fase de frontend posterior e não justifica endpoint ou migração.

### Contrato de leitura para o dashboard

Antes de criar endpoints, medir `/api/projects`, `/api/tasks?isSprintActive=true` e `/api/calendar/events` com base representativa. As chamadas existentes são suficientes funcionalmente para validar a direção, mas `/api/projects` inclui muita relação e `/api/tasks` não tem limite. Se o custo/volume exceder o gate de desempenho definido, criar uma leitura agregada pequena e somente de leitura, sem mudar schema:

`GET /api/dashboard/overview?from=<ISO-8601>&to=<ISO-8601>`

Resposta proposta:

```json
{
  "asOf": "2026-10-12T15:00:00.000Z",
  "window": {
    "from": "2026-10-12T00:00:00.000Z",
    "to": "2026-10-19T00:00:00.000Z"
  },
  "projectCounts": {
    "total": 6,
    "planning": 2,
    "active": 3,
    "completed": 1
  },
  "projects": [
    { "id": "uuid", "title": "Projeto", "status": "ACTIVE", "type": "SOFTWARE" }
  ],
  "focusTasks": [
    {
      "id": "uuid",
      "title": "Preparar entrega",
      "status": "IN_PROGRESS",
      "dueDate": null,
      "project": { "id": "uuid", "title": "Projeto" },
      "stage": { "id": "uuid", "title": "Em execução" }
    }
  ],
  "upcomingEvents": []
}
```

`projects` deve ser uma projeção mínima; `focusTasks` deve ter limite de resposta configurado no servidor e ordenação determinística; `upcomingEvents` deve reaproveitar a projeção unificada atual com limite. `from/to` são instantes ISO UTC calculados pela interface a partir do dia local e do horizonte mostrado. Validar limites e datas no controller. A chave `asOf` informa quando o snapshot foi produzido. O endpoint não deve devolver dados de produtividade histórica.

Se o desempenho das chamadas existentes for aceitável, adiar o agregador e deixar explícito no relatório que os dados vêm dos serviços existentes. Ao criar o agregador, reaproveitar `calendarService`, evitar includes sem uso e manter o contrato em `frontend/src/types/index.ts`/`services/api.ts` alinhado ao DTO do backend.

## Telas, componentes e arquivos prováveis

| Área | Frontend/componentes | Backend/schema | Comportamento e dados |
| --- | --- | --- | --- |
| Shell / navegação | `App.tsx`, `types/index.ts`, `Navbar.tsx`, `TopHeader.tsx`, `index.css`, `tailwind.config.js` | Sem mudança inicialmente | Overview como home; Projetos continua independente; todas as rotas e tema preservados. |
| Visão geral | Novo `DashboardOverviewPage.tsx`; `DashboardFocusCard`, `UpcomingEventsPanel`, `ProjectSummaryPanel`, `ComingSoonCard` reutilizáveis; possível `overviewSelectors.ts` | Só se perfil pedir `dashboard.controller.ts`, `dashboard.service.ts`, `dashboard.router.ts` e mount em `index.ts` | Hero com arte original, foco real, agenda e resumo de projetos; cards futuros claramente marcados. |
| Projetos | `ProjectList.tsx`, `ProjectCard.tsx` | Nenhuma mudança de schema | Capas originais locais selecionadas por mapa estável de assets (ID estável/hash), sem upload ou persistência de capa na primeira entrega. |
| Kanban | `KanbanBoard.tsx`, `KanbanColumn.tsx`, `StageColumn.tsx`, `TaskCard.tsx`, `DashboardOverview.tsx` | Sem mudança para primeira entrega | Quadro amplo e funcional; resumo explicita “deste projeto”; busca não deve alterar totais do projeto sem indicação de filtro. Movimento de drag explica estado e conserva alternativa acessível. |
| Sprint / Foco | `sprint/SprintKanbanView.tsx`, `AddToSprintModal.tsx` | Sem mudança até normalizar Sprint | Exibir tarefas `isSprintActive`, projeto e miniatura associada. Não chamar de janela semanal fechada enquanto houver ambiguidade entre flag e Sprint datada. |
| Calendário | `calendar/CalendarView.tsx`, `CreateAppointmentModal.tsx`, tipos e `api.ts` | Serviço atual | Mês + lista do dia; mobile prioriza agenda diária. Cartões de próximos eventos podem usar acento visual discreto. Corrigir literal `ACADEMIC_ASSIGNMENT` no tipo de frontend. |
| Área acadêmica | `academic/AcademicView.tsx`, `CreateSubjectModal.tsx`, `CreateAssignmentModal.tsx` | Sem mudança inicial | Matérias e entregas atuais; capas originais associadas por regra local estável, com cor da matéria como acento e contraste preservado. |
| Modais e estados | Modais atuais em `Create*Modal.tsx` | Sem mudança | Padrões comuns de foco, Escape, retorno de foco, validação, loading, erro e sucesso. Não inserir arte grande em formulários; a linguagem vem de tokens e feedback. |
| Imagens | `frontend/public/assets/*` + manifesto TS de proporções/nome/alt | Sem mudança de schema | Imagens geradas no projeto e servidas localmente; `alt=""` quando decorativas e texto ao redor já descreve o conteúdo. Nada de URL de referência/terceiro em runtime. |

## Plano de assets via imagegen

A geração acontece antes de codificar o layout da visão geral. Usar a skill `imagegen` integrada para criar, revisar e iterar um conjunto original na linguagem “energia gamer + progresso pessoal abstrato”, sem texto desenhado dentro das artes, logos, marcas ou personagens identificáveis.

| Asset | Proporção-alvo | Uso e composição | Entrega |
| --- | --- | --- | --- |
| Hero principal | 3:1, aprox. 1536×512 ou recorte compatível | Cena abstrata de avanço, camadas/luz cinematográfica, área negativa para conteúdo HTML. | `frontend/public/assets/overview-hero.webp` (ou formato otimizado aprovado). |
| Capas de projetos/matérias | 4:3, conjunto de 3–5 imagens | Variações com motivos abstratos distintos, mesma direção de cor/luz. Reutilizáveis em sprint pela capa do projeto associado. | `frontend/public/assets/card-progress-01.webp` etc.; manifesto local com chave e texto alternativo. |
| Vazio/primeiro uso | 1:1 | Marca visual amigável e original para estado sem projetos/atividades; sem texto incorporado. | `frontend/public/assets/empty-workspace.webp`. |

Revisar composição com os cards reais, crop desktop/mobile, tema claro/escuro, peso e contraste. Final aprovado deve ser copiado para `frontend/public/assets/` antes de referenciar no código; não deixar variantes de rascunho nesse diretório ou servidas pelo app. O layout precisa tolerar erro de carregamento do asset com fallback local.

## Linguagem de movimento

Criar tokens compartilhados de duração/easing e três níveis: (1) microfeedback de foco/hover/status; (2) transições de cards e imagens ao entrar/trocar estado; (3) movimento de estrutura em drag e mudança de página. Usar deslocamento e profundidade apenas para indicar foco, sequência ou resultado. Cards com imagem podem revelar camadas ou ajustar crop com movimento curto; sem carrossel/autoplay como requisito.

`prefers-reduced-motion` deve desativar/encurtar entrada em cascata, parallax, escala/crop animado e transições de imagem. Cor, texto, borda, ARIA e anúncio de estado permanecem. Regras em CSS/Tailwind são preferidas para a primeira versão; Motion é referência, não dependência automática. Cards precisam ser interativos por teclado/foco e toque sem depender do hover. Evitar filtros caros, sombras animadas, grandes áreas em repaint e animação contínua; conferir no browser em desktop e mobile.

## Persistência opcional para histórico

Esta trilha não bloqueia nem participa da entrega visual inicial. Primeiro decidir definição de “conclusão”, “dia ativo”, reabertura, fuso e retenção ao excluir tarefa.

### Modelo recomendado se o usuário aprovar produtividade histórica

Adicionar um modelo append-only `TaskStatusEvent`, com `id`, `taskId`, `fromStatus`, `toStatus`, `occurredAt` UTC e relação com `Task`. Usar índice por `toStatus + occurredAt` para consultas de conclusão por intervalo e `taskId + occurredAt` para histórico por tarefa. `TaskService.updateTask` registra evento na mesma transação apenas quando o status realmente muda; todos os caminhos REST/MCP passam pelo serviço comum. Não gravar evento ao atualizar título/prazo nem duplicar PATCH repetido com mesmo status.

Contrato sugerido: `GET /api/dashboard/history?from=YYYY-MM-DD&to=YYYY-MM-DD&timezone=America/Sao_Paulo`, validando intervalo, máximo de dias e timezone IANA. Agregar no servidor por data local explicitamente pedida:

```json
{
  "window": { "from": "2026-10-01", "to": "2026-10-31", "timezone": "America/Sao_Paulo" },
  "dataAvailableFrom": "2026-10-15T12:00:00.000Z",
  "completedTransitionsByDay": [{ "date": "2026-10-15", "count": 2 }],
  "activeDays": [{ "date": "2026-10-15", "active": true }]
}
```

Definição inicial sugerida para discussão: a série conta **transições para DONE** no período, não tarefas únicas atualmente concluídas; um novo DONE após reabertura é outra transição. “Sequência” conta dias locais consecutivos com pelo menos uma transição para DONE desde `dataAvailableFrom`. Não persistir sequência acumulada; calculá-la a partir do log. Validar se o usuário aceita essa semântica antes de tornar o card funcional. Sem conta/usuário no schema atual, esses dados são globais ao banco/workspace atual, não por perfil.

### Dados legados e migração segura

Não é possível reconstruir quando tarefas antigas foram concluídas: `updatedAt` pode refletir qualquer edição. Não preencher `completedAt` nem semear eventos para linhas legadas DONE. `dataAvailableFrom` deve ser o instante UTC do rollout da gravação; séries anteriores ficam desconhecidas e o card informa o começo do histórico observado. Se o usuário preferir não expor essa lacuna, manter card “Em breve”.

Hoje não há `backend/prisma/migrations/` no repositório. Antes de migrar: identificar ambiente e banco alvo; obter backup restaurável; registrar versão do schema real e testar em cópia isolada. Criar um baseline versionado que represente o schema existente e só marcá-lo aplicado depois de comparar o SQL e a estrutura real. Se houver drift, revisar e reconciliar explicitamente, sem reset. Em seguida gerar migração separada e somente aditiva para `TaskStatusEvent`/índices, testar em banco descartável e cópia, verificar escrita de evento e rollback planejado. Não executar `prisma db push`, `migrate reset`, backfill por timestamp ou alteração direta em produção como parte do redesign visual.

Decisão pendente: evento deve ser removido junto com exclusão permanente da tarefa (cascade, padrão coerente com o domínio atual), ou estatística deve sobreviver a exclusões? O padrão proposto é cascade e métricas somente de tarefas ainda representadas no banco; mudar isso exige regra explícita de retenção.

## Fases, propriedade e dependências

| Fase | Entregável / responsável | Arquivos principais | Dependências e critério de avanço |
| --- | --- | --- | --- |
| 0. Contrato do primeiro corte | Orquestrador + `product_direction_researcher`; confirmar semântica “Foco”, horizonte de calendário, seleção de asset por ID e custo dos endpoints atuais. | Só documentos; mapa de contrato | Bloquear novos dados históricos. Aceite: cada widget tem fonte e rótulo; interfaces futuras são “Em breve”; critério de desempenho dos endpoints está escrito. |
| 1. Base visual e shell | `frontend_coder` | `frontend/src/index.css`, `tailwind.config.js`, `App.tsx`, `types/index.ts`, `Navbar.tsx`, `TopHeader.tsx`, componente de tokens | Adicionar rota Overview sem remover fluxos, motion tokens e reduced-motion, foco responsivo/teclado. Gate visual do shell antes de novas páginas. |
| 2. Arte original | `design_orchestrator` gera via imagegen; `design_reviewer` avalia variante e crop | `frontend/public/assets/*` + manifesto de assets | Finalizar banner, capas, vazio antes de a visão geral ser codificada; aprovar em mobile/desktop e temas. |
| 3. Overview integrado | `frontend_coder`; `backend_coder` só implementa agregador caso medição mostre necessidade | Novo `DashboardOverviewPage.tsx`, pequenos blocos reutilizáveis, `api.ts`, tipos; opcional `backend/src/modules/dashboard/*` + router/mount | Consumir APIs atuais com range limitado; se criar endpoint, congelar DTO acima antes de editar os dois lados. Mostrar dados reais e cards futuros sem falso clique. |
| 4. Projetos/Kanban/Foco | `frontend_coder` | `ProjectList.tsx`, `ProjectCard.tsx`, `KanbanBoard.tsx`, `TaskCard.tsx`, `KanbanColumn.tsx`, `StageColumn.tsx`, `sprint/*` | Mesmo token/art/motion system; corrigir resumo que recebe tarefas filtradas; testar CRUD/drag e foco. Resolver Foco vs Sprint datada separadamente, sem alterar schema na primeira fase. |
| 5. Calendário/Academia/Modais | `frontend_coder` | `calendar/*`, `academic/*`, `Create*Modal.tsx`, types/api | Conservar interação e dados; reparar union `ACADEMIC_ASSIGNMENT`; desktop/mobile e estados vazios/erro. |
| 6. Histórico opcional | `backend_coder` para Prisma/migration/service/controller/route; `frontend_coder` para DTO e cards | `schema.prisma`, baseline e nova migration, `TaskService`, types/controller/API/dashboard cards | Só após definição aprovada de semântica/fuso/retention. Nunca inferir histórico legado; contrato de eventos definido acima. |
| 7. Revisão e iteração | `design_reviewer` + orquestrador após cada fase | Capturas e relatório de revisão; ajustes nos arquivos da fase pelo agente dono | Corrigir falhas visuais ou funcionais altas antes de avançar; não declarar redesenho pronto enquanto uma página obrigatória estiver desconectada. |

Nenhum agente edita os mesmos arquivos simultaneamente. Contrato é aprovado antes do frontend e backend trabalharem no mesmo DTO; frontend mantém telas enquanto backend atua em módulos próprios. Imagens entram na árvore local antes do primeiro componente que as referencia.

## Ciclo de qualidade e gates visuais

O aceite de cada fase combina build/contrato com revisão de produto no navegador. “Compilou” não significa “aprovado visualmente”.

1. **Direção:** manter a ideia “painel de progresso pessoal”; mapa de página define foco, fonte de dado, CTA e arte antes do código.
2. **Referências:** escolher no máximo poucos padrões concretos (Bento Grid para proporções, spotlight somente no foco se acessível, sidebar agrupada e progress acessível). Registrar o que será próprio do BrainBoard; não importar catálogo inteiro.
3. **Assets:** gerar com imagegen, revisar, aprovar e salvar versões finais locais antes da tela. Sem placeholders servidos nem referência copiada.
4. **Protótipo integrado:** capturar cada fase em navegador nos viewports 1440×900 e 390×844; claro/escuro; dado real, vazio e erro quando aplicável.
5. **Comparação objetiva:** conferir sidebar persistente vs menu mobile, hero principal, coluna lateral, ritmo de card e faixa de foco contra `img/ideias.png`, `img/img.png`, `img/videoframe_11685.png`, webp e img3. Avaliar ordem/hierarquia e função, não semelhança de conteúdo gamer.
6. **Iteração:** reviewer aponta problemas por prioridade e elemento; agente dono ajusta; repetir captura para as áreas alteradas.
7. **Motion/performance:** testar hover, foco, entrada, mudança de estado, imagem, drag, reduced-motion, scroll e consumo; retirar efeito que atrapalhe leitura, toque, teclado ou desempenho.

Gate visual de fase: telas cobertas têm composição/hierarquia aprovadas; desktop e mobile legíveis sem overflow indevido; asset correto e crop útil; contraste e foco claros em ambos temas; cards futuros identificáveis; nenhum estado falso; movimento coerente e reduced-motion equivalente; nenhuma falha visual alta continua aberta.

## Verificações e testes a planejar

Não há atualmente uma suíte frontend declarada: `frontend/package.json` só expõe `build`; `backend/package.json` tem `test` placeholder que falha. Há harnesses existentes em `tests/`, mas precisam de inventário pelo agente dono antes de reutilizar. Definir o runner mais simples compatível sem migrar stack apenas para copiar componentes.

- **Builds:** `npm run build` no frontend e backend após mudanças relevantes.
- **Frontend/puro:** testar selectors de Overview (status counts, limites, ordenação local por data, empty/error parcial), associação estável de asset e renderização `ACADEMIC_ASSIGNMENT`.
- **Integração API:** projetos vazios e mistos; foco com tarefas de projeto e sem data; compromisso/tarefa/atividade acadêmica em limites `from/to`; exclusão de concluídos; falha isolada de uma fonte não esconde as demais; filtrar event range/timezone.
- **Regressão:** criar/mover/excluir tarefa e subtarefa, alternar tema, busca Ctrl/Cmd+K com teclado ABNT2/AltGraph, navegação por áreas, selecionar mês/dia e concluir compromisso.
- **Banco opcional:** aplicar baseline só em cópia vazia equivalente e em cópia representativa; preservar rows e relações; verificar que tarefas DONE antigas não ganham eventos; transição real para DONE cria um evento; PATCH idempotente não duplica; DONE→TODO→DONE registra novo evento; rollback/reconciliação é documentado.
- **Histórico/fuso opcional:** intervalos inclusivos, mudança de mês/ano, timezone inválido, limite máximo, local midnight/UTC boundary; “dias ativos” deriva somente de eventos após rollout.
- **A11y/visual manual:** desktop/mobile, temas claro/escuro, focus order, Escape e retorno de foco, mouse/toque/teclado, `prefers-reduced-motion`, alt de imagens, contraste, crop, erro de asset e estados vazios.

## Referências externas verificadas nesta rodada

Usar como inspiração pontual; códigos atuais podem mudar e precisam de revisão de licença, dependências e compatibilidade. O BrainBoard usa React 18.3 e Tailwind 3.4; não copiar instrução atual de Tailwind 4 ou adotar Motion automaticamente.

1. **Visual/estrutura — Bento Grid:** [Aceternity UI](https://ui.aceternity.com/components/bento-grid). Adaptar slots e tamanhos assimétricos para Overview funcional; evitar inclinação/marketing card.
2. **Interação — Card Spotlight:** [Aceternity UI](https://ui.aceternity.com/components/card-spotlight). No máximo no hero; brilho baseado em pointer precisa alternativa de foco/toque e não pode carregar significado.
3. **Navegação — Sidebar:** [shadcn/ui](https://ui.shadcn.com/docs/components/sidebar). Referência de grupos, regiões fixas e colapso/mobile; shell atual já existe e deve ser refinado, não substituído automaticamente.
4. **Código acessível — Progress:** [shadcn/ui](https://ui.shadcn.com/docs/components/progress). Associar label, valor e track; o BrainBoard já tem `role="progressbar"`, então basta acertar escopo semântico/reuso.
5. **Interação/a11y — reduced motion:** [Motion `useReducedMotion`](https://motion.dev/docs/react-use-reduced-motion). Referência para trocar parallax/movimento por opacidade e responder a mudança de preferência; primeira implementação pode usar CSS media query sem dependência.

## Decisões de produto ainda abertas

- Qual timezone deve definir dias e sequência, caso o usuário aprove métricas históricas?
- Histórico conta toda transição para DONE, tarefas únicas atualmente DONE ou outra fórmula? Recomendação apresentada: transições registradas e início do histórico na data de implantação.
- Ao apagar uma tarefa, os registros históricos também são apagados? Padrão proposto: cascade.
- A faixa inicial continua sendo “Foco” por `isSprintActive` ou deve passar a usar entidade Sprint com datas? Até decisão, não alegar semana com datas.
- Relógio local deve sair de “Em breve” depois do primeiro corte? Se sim, formato/hora local; nenhum backend é necessário.
- Quer um personagem original recorrente? Recomendação: arte abstrata como primeira entrega e decisão de mascote depois da revisão visual.

## Registro integrado de implementação e validação — 16/10/2026

- O estado operacional atual tem API local funcional e dados reais; a falha antiga de autenticação do banco foi resolvida. As verificações foram read-only, sem alterar registros ou expor credenciais. Consulte `REDESIGN_PLAN.md` para evidências visuais e histórico detalhado das capturas.
- Entregas focais confirmadas no código/runtime: modal global de foco em portal com limite de altura/rolagem interna; filtro do calendário reconhece `ACADEMIC_ASSIGNMENT`; área acadêmica agrupa `IN_PROGRESS` e distingue tarefas vencidas de acordo com a data local, preservando DONE e o dia atual.
- Cobertura funcional read-only: lista/busca de projetos; Kanban por status e etapa, com KPIs integrais sob busca contextual; Foco global e de projeto; filtro de eventos acadêmicos; atividade real de LICS vencida. Modais de criação foram abertos e cancelados, sem submit.
- `npm run build` TypeScript + Vite e `git diff --check` passaram após as correções focais. `impeccable audit` não existe nesta instalação; o detector e a revisão manual têm escopo explicitado em `REDESIGN_PLAN.md`.
- Permanecem limites de validação: ramo acadêmico `IN_PROGRESS` sem registro real; tablet ainda sem inspeção populated; toque/drag físico e hover amplo não testados; `prefers-reduced-motion` sem emulação visual. Um vazio da busca do Foco reaproveita o texto genérico por coluna e fica para avaliação de copy numa rodada posterior. Nenhuma mudança de contrato, banco, seed ou credencial foi necessária.

## Continuação da rodada visual — 16/10/2026

- Edge em tema claro confirmou Overview, Projetos com três cards, Kanban por status e por etapa, Foco global e Foco do projeto com dados reais. No mobile, Overview e Projetos (incluindo busca real por “Faculdade”) foram vistos sem overflow; o modal AddToFocus fechou por Escape e devolveu foco sem submit.
- Kanban por etapa: correção mobile compacta os KPIs em 2×2 e deixa o CTA de nova etapa com altura própria, não esticada pela coluna longa. Evidência Edge pós-HMR nos dois temas: 493×136,5px desktop e 344×62,5px mobile, `min-height:auto`, `align-self:flex-start`, sem overflow.
- Foco do projeto: compactação condicional ao projeto preserva Foco global e desktop; primeira tarefa completa visível em 390×844 escuro e título visível em claro. Build e diff-check passaram após alterações em `KanbanBoard.tsx`, `DashboardOverview.tsx` e `SprintKanbanView.tsx`.
- Auditoria Impeccable: `audit` e `critique` não estão disponíveis neste binário; revisão manual, DOM/screenshot e build foram usados, sem declarar comandos automatizados concluídos. Edge não emulou `prefers-reduced-motion` nem toque físico.
- Próximo passo autorizado: prototipar um shell de “espaço pessoal de progresso” reversível (query `?shell=progress`) mantendo o original sem query. O shell deve elevar identidade, labels/grupos e acesso a projetos com contexto local claro, sem métricas fictícias; reviewer compara original/protótipo em desktop/mobile/temas antes de consolidar.
- Confirmação shell/ambient: protótipo `?shell=progress` versus `/` foi visto em Edge desktop/mobile, claro/escuro; labels/capas/links locais melhoram orientação, sem overflow. Alternador foi ampliado a 44px. A imagem `ambient-world.png` está opt-in em `?shell=progress&backdrop=ambient`, com crop, overlays, movimento lento apenas por transform, pausa quando a aba fica oculta e imagem estática sob `prefers-reduced-motion`. Edge confirmou screenshots 1912×900 e 390×844 nos dois temas; reduced-motion não pôde ser emulado. Build TypeScript + Vite, diff-check e detector scoped passaram.
- Feedback posterior do usuário: sidebar fixa + header utilitário + KPIs ainda dão sensação de dashboard; imagem não muda estrutura. Próximo protótipo autorizado deve ser uma alternativa `?shell=hub` com composição de game-platform hub: navegação curta em topo/abas, coleção de projetos em shelf/contexto, hero de foco com ação “Continuar”, conteúdo em faixas e métricas abaixo como apoio, usando só dados reais. Preservar `/`, não criar dois headers nem chrome extra, e comparar hub versus original nos breakpoints/temas antes de decidir. Não declarar o design alinhado antes dessa avaliação estrutural.
- O reviewer confirmou que o alternador móvel `Ver protótipo` agora mede 76,9×44px em Edge claro/escuro, sem perder a página ativa. Em seguida foi autorizada a hipótese `?shell=hub`, que deverá remover a rail lateral e reorganizar a Overview como hub real de continuidade, mantendo rota padrão/protótipo anterior separados. Implementação/review runtime está em andamento; a aprovação visual ainda não foi declarada.
- Reviewer verificou `?shell=hub` em Edge: a estrutura de hub com hero de tarefa/contexto real, shelf de projetos e tabs superiores reduz a sensação de dashboard; desktop/mobile claro/escuro sem overflow, navegação e back/forward funcionam. A faixa de tabs tem affordance de scroll e alcança teclado. Ambient opt-in foi capturado em desktop claro/mobile escuro. Achados P2: títulos longos de projeto cortados e badges sobre capas com contraste variável; correção focal solicitada apenas à shelf, sem alterar tabs. Tablet e emulação visual de reduced-motion seguem sem suporte.

### Confirmação da prateleira Hub — 16/10/2026

- Títulos longos de projeto agora quebram em até duas linhas e o accessible name do botão mantém o título integral; o status badge tem fundo opaco com contraste consistente. Edge confirmou desktop e mobile 390×844, claro/escuro; cards mobile 304×222px e nenhum overflow horizontal. Build TypeScript + Vite e `git diff --check` passaram após a correção.
- A direção Hub deixa de depender da sidebar fixa e está aprovada visualmente como hipótese mais próxima de plataforma pessoal, mas continua reversível (`?shell=hub`) até escolha do usuário. `/` foi restaurada para Overview dark 1912×900.
- Tablet, touch físico e emulação reduced-motion permanecem fora de evidência; P0/P1 não observados. O redesign integral ainda tem gates de estado vazio real/submissões, `IN_PROGRESS` acadêmico e decisão final de shell.


### Confirmação acadêmica — 16/10/2026

Edge confirmou “Apresentação” no card LICS sem enum cru, e o modal Nova Atividade após scroll em desktop/mobile, incluindo viewport 390×480: portal sobre o header fixo, campo focado e footer acessíveis, Escape fecha e retorna foco; nenhuma submissão. P1/P2 resolvidos. Build e diff-check passaram. Touch físico e reduced-motion emulado seguem sem cobertura.

### Hub: moldura game-inspired — 16/10/2026

Protótipo reversível restrito a `?shell=hub`: filete interno e brackets discretos em dois cantos do hero real, sem HUD e sem ornamentos repetidos na prateleira/painel. Edge confirmou desktop 1912×900 e mobile 390×844 em claro/escuro; sem colisão ou overflow, CTA ~254×44px. `/` e `?shell=progress` intactos. Build e diff-check passaram. Prateleira abaixo da dobra no mobile é tradeoff existente; toque físico/reduced-motion não emulados. A direção permanece hipótese até decisão do usuário.
