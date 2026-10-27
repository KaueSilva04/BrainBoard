# Briefing para o orquestrador — redesign do BrainBoard

## Missão

Conceber uma experiência coesa para **todo o BrainBoard** como um **painel de progresso pessoal**. O usuário quer a organização, a energia visual e a sensação de acompanhamento dos dashboards gamer que colocou em `img/`. O produto continua sendo um sistema para projetos, tarefas, sprint, calendário e estudos; jogos, lojas, amigos online e rankings das imagens são referências de composição, não funcionalidades a copiar.

Primeiro, **monte a direção de produto e o plano de implementação**. Investigue antes de propor telas ou pedir código aos implementadores. O usuário autorizou iniciar a implementação depois desse planejamento e prefere avaliar um primeiro resultado funcional para então melhorá-lo. Trabalhe em fases verificáveis, sem esperar nova autorização para as mudanças já solicitadas.

## Decisões já expressas pelo usuário

- A prioridade é **estrutura, disposição dos elementos, hierarquia e acabamento**. A paleta das imagens não é obrigatória.
- O estilo deve alcançar o sistema inteiro para não deixar telas desconexas. A composição muda conforme a função de cada tela; o Kanban não precisa caber no mesmo grid da visão geral.
- A gamificação deve comunicar progresso e controle pessoal, sem transformar o BrainBoard em painel de jogos.
- Ideias de `img/ideias.png` que ainda não estejam implementadas devem aparecer, quando fizerem sentido na composição, como **cards claramente marcados “Em breve”**. Não exiba números inventados, controles que parecem funcionar sem funcionar ou métricas como se estivessem disponíveis.
- O usuário quer **imagens originais** em banners e cards, com riqueza visual semelhante às referências. Planeje os assets junto com o layout; não substitua essa intenção por blocos vazios ou por imagens de jogos copiadas.
- Use a skill local **`imagegen`** para produzir essas imagens originais quando chegar à fase de assets. Revise as variantes e salve as escolhidas no projeto antes de ligar os componentes a elas.
- Anime **cards e imagens** como parte da mesma linguagem em todas as áreas: entrada, hover/foco, mudança de estado, transição de imagem e feedback de ações devem ter ritmo coerente. O movimento deve valorizar a composição sem prejudicar leitura, desempenho, teclado ou `prefers-reduced-motion`.
- O usuário quer atenção a animações e microinterações, avaliadas pelo efeito real na experiência.
- Modo escuro, botão de preferência de tema e entrada com teclado brasileiro já fazem parte do contexto atual e devem continuar funcionando.
- Não abrir janelas visíveis do PowerShell ou CMD. Os agentes podem usar Git localmente, mas não podem fazer push, conforme `AGENTS.md`.

## Referências visuais

Examine **todas** as imagens em `img/`, inclusive as que forem adicionadas depois deste briefing. Registre o papel de cada uma e possíveis conflitos entre elas.

- `img/ideias.png`: anotação do usuário sobre a composição de `img/original-82442c2f0e80eb622d1001c0d9a970c3.webp`. Investigar um bloco principal para visão geral/produtividade, cards intermediários com animações úteis, sprint semanal global em faixa horizontal, painel de estatísticas e uma área lateral para relógio ou elemento pessoal.
- `img/img.png`: referência de navegação compacta à esquerda, destaque principal, listas de apoio à direita e visual escuro de alta densidade.
- `img/videoframe_11685.png`: referência de navegação superior, módulos de tamanhos diferentes e composição com painel lateral. Traduzir a hierarquia para o domínio do BrainBoard.
- `img/img3.avif`: referência nova; abrir e avaliar diretamente antes de atribuir características ou prioridade a ela.

Use as referências para identificar padrões transferíveis: proporções, ritmo, distribuição de atenção, profundidade, bordas, tipografia, densidade e transições. Não reproduza marcas, personagens ou conteúdo protegido como parte da interface.

## Repertório de componentes para os agentes

- [React Bits](https://reactbits.dev/): explorar animações de cards, imagens, entradas e fundos; escolher poucos exemplos adaptáveis a React/TypeScript/Tailwind.
- [Aceternity UI](https://ui.aceternity.com/explore): estudar Bento Grid, Card Spotlight, Focus Cards e layouts de destaque; adaptar composição e interação ao conteúdo do BrainBoard.
- [shadcn/ui](https://ui.shadcn.com/): consultar padrões funcionais para diálogos, formulários, menus e estados. O projeto usa React 18 e Tailwind v3; não migrar a stack só para copiar um componente da documentação atual.
- [Motion](https://motion.dev/docs/react-use-reduced-motion): referência para coordenar movimento e respeitar redução de animações.

Esses catálogos são repertório, não uma lista de dependências obrigatórias. Escolha componentes pelo fluxo real, verifique licença e compatibilidade, e mantenha tokens, acessibilidade e ritmo de movimento próprios do BrainBoard. Evite acumular efeitos diferentes em cada tela.

## Trabalho do orquestrador e dos agentes

1. Peça ao `product_direction_researcher` um inventário verificável do sistema atual, comparado às ideias em `img/`: implementado, parcial, ausente ou indefinido. Quando houver dúvida de produto ou interação, peça até cinco exemplos externos atuais com links e motivo específico de uso.
2. Peça ao `design_reviewer` uma análise crítica da interface em execução e das referências, cobrindo desktop e mobile, navegação, legibilidade, responsividade, estados vazios e animações. A inspeção da aplicação deve ser feita no navegador real via CUA/Browser, com interação e evidências visuais (capturas de tela quando disponíveis); a árvore de acessibilidade é complementar e não substitui a análise visual. Se o navegador ou a aplicação não estiver acessível, registre o bloqueio e não marque a revisão visual como concluída.
3. Sintetize **uma direção recomendada** para o BrainBoard inteiro, com a estrutura da visão geral e a adaptação da mesma linguagem a projetos, Kanban, sprint global e por projeto, calendário, área acadêmica e modais. Explique diferenças deliberadas entre as telas.
4. Separe conteúdo já sustentado por dados de funcionalidades novas. O resumo atual calcula progresso das tarefas de um projeto; isso não equivale automaticamente a progresso global, produtividade histórica ou sequência diária. O esquema atual não registra a data de conclusão de cada tarefa. Defina o significado e a fonte de cada métrica proposta antes de solicitar backend.
5. Avalie especificamente o relógio e um possível personagem/companheiro lateral. Um relógio local pode ser feito no frontend; histórico, personalização sincronizada ou evolução persistente podem exigir backend. Recomende o que agrega valor e o que deve esperar.
6. Defina onde entram banners e imagens originais, com tema, proporção aproximada e função de cada asset. **Use a skill `imagegen` já disponível** para gerar a arte raster na fase de produção, preservando as referências apenas como orientação de composição. Ícones simples e elementos de interface devem continuar no sistema de componentes/SVG. Planeje também o comportamento de movimento das próprias imagens e dos cards que as contêm.
7. Produza um plano em fases pequenas e verificáveis, com dependências e propriedade de arquivos. Só delegue `frontend_coder` e `backend_coder` depois de definir contratos de dados e telas da fase. Revise o código e o resultado visual de cada fase com o `design_reviewer`.

## Entrega esperada nesta etapa

Escreva uma proposta que contenha: mapa das referências e do estado atual com evidências; conceito central e princípios visuais; esboço textual da visão geral e **de todas as páginas internas**; cards “Em breve” para ideias ainda indisponíveis; plano de imagens originais; componentes e tokens compartilhados; comportamento de animações; métricas reais e lacunas de dados; fases de execução com critérios de aceite; decisões que dependem realmente do usuário. Recomende escolhas quando houver alternativas, em vez de devolver uma lista aberta de possibilidades.

Critérios permanentes: legibilidade e contraste nos temas claro/escuro, navegação por teclado ABNT2, responsividade, `prefers-reduced-motion`, feedback claro das ações, desempenho razoável e nenhuma estatística inventada. Preserve os fluxos existentes enquanto o visual evolui.

## Próxima entrega: plano técnico de implementação

Depois da direção em `REDESIGN_PLAN.md`, peça ao `product_direction_researcher` para partir **da ideia central aprovada como hipótese** e localizar exemplos concretos de elementos semelhantes (cards com arte, destaque principal, navegação, painéis laterais, progresso, estados “Em breve” e movimento). Para cada exemplo, registre link, aspecto aproveitável, diferença para o BrainBoard e se serve como referência visual, interação ou componente de código. Compare com o sistema atual e enumere o que falta construir; não transforme uma galeria inteira em dependência.

O `design_orchestrator` deve então escrever `IMPLEMENTATION_PLAN.md`, com frentes explícitas de frontend, backend e banco de dados. Para cada fase: comportamento esperado, arquivos/componentes ou módulos prováveis, contratos e dados necessários, dependências entre frentes, migração e tratamento de dados existentes quando houver, critério de aceite e verificação. Separe o que pode ser entregue já com dados reais do que fica como card “Em breve” e o que exige persistência nova. O plano deve cobrir todas as telas e a produção de imagens via `imagegen`. Depois disso, coordene a implementação autorizada pelo usuário e valide cada entrega no código e visualmente.
