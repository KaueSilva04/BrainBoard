# Avaliação de lacunas do redesign

**Escopo:** revisão da primeira passada e de sua segunda passada na Visão geral, comparadas com `img/ideias.png`, `img/img.png` e `img/videoframe_11685.png`.  
**Limitação:** navegador automatizado indisponível nesta sessão. Esta é uma avaliação de estrutura, assets e código; crop em runtime, responsividade real e animações precisam de uma revisão visual no navegador.

## Parecer

A primeira passada estabeleceu uma base funcional, mas ficou aquém da composição de referência. A segunda passada agora aproxima a Visão geral da estrutura anotada: hero estável e faixa de foco na área principal; agenda, status real e cards pessoais futuros na coluna lateral. O desenho ainda precisa de refinamento de identidade, assets e movimento para sair da aparência de dashboard SaaS convencional.

O principal próximo passo é conferir essa nova composição no navegador e ajustar proporções, recortes e alturas. Depois, definir a linguagem visual compartilhada entre as áreas. A direção pode usar proporções e hierarquia das referências sem importar conteúdo de jogos.

## Lacunas por prioridade

### P0 — Composição da Visão geral: coberta em estrutura; revisão visual pendente

- `DashboardOverviewPage.tsx` agora usa coluna principal e aside; o hero tem chamada estável e tarefa real subordinada; tarefas de foco ficam numa faixa horizontal; agenda e contagem/distribuição de projetos ficam na coluna lateral.
- Produtividade, sequência e relógio ficam juntos no espaço pessoal e estão marcados “Em breve”.
- A hierarquia está mais próxima de `ideias.png`, mas a responsividade e as alturas do aside sticky precisam ser conferidas renderizadas, especialmente em 390×844 e em desktops menores.
- A faixa de foco apresenta cards lado a lado com scroll horizontal. A leitura, indicação de que há mais conteúdo e comportamento de teclado/toque precisam de revisão em navegador.
- O hero agora separa mensagem e próxima tarefa; o título longo da tarefa ainda requer conferência de quebra e equilíbrio com a imagem.

**Próximo refinamento:** manter essa arquitetura e ajustar as proporções, usar composição de projeto menos repetitiva e dar mais hierarquia aos cards de projeto. No mobile, conferir a ordem da coluna auxiliar abaixo do foco. Usar apenas dados que já existem; métricas históricas continuam “Em breve”.

### P1 — Identidade visual e ritmo entre páginas: base criada; cobertura parcial

- `index.css` agora define tokens compartilhados para superfícies, bordas, marca, sombra, raio, espaço e movimento. A regra permite acentos de módulo, mas precisa ser comparada visualmente para garantir que índigo/ciano, roxo/fúcsia e âmbar permaneçam subordinados à mesma marca.
- As classes comuns foram aplicadas em Overview, Projetos, Calendário, Academia, Sprint e alguns cards compartilhados. KanbanBoard, KanbanColumn, StageColumn e modais ainda conservam partes significativas da linguagem anterior; isso pode ser deliberado por função, mas requer revisão integrada.
- Os banners têm composição semelhante em Overview, Projetos, Calendário e Academia, enquanto Kanban e Sprint mantêm estruturas funcionais próprias. Falta confirmar que shell, cabeçalho, ritmo e tipos de superfície fazem as áreas parecerem parte do mesmo workspace.
- O shell agora usa uma rail compacta de ícones em desktop, aproximando a navegação da referência; os nomes permanecem acessíveis e disponíveis como dicas. No celular, o drawer mantém os rótulos visíveis.
- O cabeçalho continua no topo da área de conteúdo. A revisão renderizada deve confirmar se rail, cabeçalho e grade de módulos compartilham proporções e hierarquia adequadas.

### P1 — Uso das imagens

- O acervo agora tem onze capas para projetos: quatro imagens existentes e sete novas cenas originais (observatório, percurso modular, biblioteca, estúdio, sistema conectado, estufa e mapa topográfico).
- `getProjectCover` distribui as capas de modo determinístico por projeto; cards carregam as imagens sob demanda. Ainda não há seleção manual de capa salva por projeto.
- A arte de banner e os cards de projeto agora têm mais variedade. Outros módulos precisam de imagens com função e proporção próprias, em vez de reutilizar os mesmos fundos.

### P2 — Movimento e microinterações: tokens e estados básicos cobertos; direção avançada pendente

- O movimento agora usa duração/easing compartilhados, entrada de página, elevação de card e escala discreta de imagem em componentes selecionados. Isso cria uma base coerente e acessível; ainda não cria o ritmo expressivo solicitado.
- Não há ainda regra comum para entrada escalonada, mudança de estado, troca/crop de imagem ou transição entre áreas. `prefers-reduced-motion` cobre a redução dos efeitos implementados, mas não substitui essa direção.
- Cada animação precisa comunicar uma ação ou hierarquia. Parallax e brilho decorativo devem ficar restritos ao destaque e não competir com tarefas e leitura.

## Critérios para a próxima iteração

1. Aprovar primeiro um wireframe da Visão geral em desktop e mobile, com proporções aproximadas da referência e posição de cada dado real.
2. Definir tokens compartilhados de superfície, borda, raio, sombra, tipografia, acento e status; manter cores por módulo como apoio, não como identidades desconectadas.
3. Gerar um conjunto pequeno de assets com crop próprio para hero, cards de projeto e estado vazio. Registrar proporção e função de cada arquivo.
4. Implementar a Visão geral antes de espalhar novos efeitos pelo restante do app; depois levar tokens e movimento às páginas internas preservando suas ferramentas próprias.
5. Revisar no navegador em 1440×900 e 390×844, claro e escuro, incluindo conteúdo longo, vazio e erro. Comparar proporção e hierarquia com as referências, não semelhança de cores ou conteúdo.

## Estado dos requisitos

| Requisito | Situação após primeira passada |
| --- | --- |
| Sistema inteiro coberto pela nova base | Parcial: tokens foram criados e aplicados em páginas centrais; Kanban, colunas e modais ainda precisam de revisão integrada |
| Cards futuros claramente “Em breve” e sem valores falsos | Atendido na Visão geral |
| Imagens originais no produto | Atendido como primeiro conjunto de fundos; falta variedade e aplicação com intenção |
| Cards e imagens animados de forma coesa | Parcial: há tokens, transições básicas e movimento reduzido; falta desenho de interações mais expressivo |
| Composição anotada: destaque, faixa horizontal, apoio lateral e painel pessoal | Atendida estruturalmente na segunda passada; proporções/crops ainda sem inspeção visual |
| Revisão visual real em desktop/mobile | Pendente por falta de navegador automatizado |

## Atualização após a segunda passada

- A Overview agora usa título principal estável, tarefa de foco subordinada, faixa horizontal real de tarefas, apoio lateral de agenda, distribuição de projetos por status e cards pessoais **Em breve**. A distribuição deriva apenas das contagens atuais do DTO; produtividade histórica, sequência e relógio continuam sem números ou ações simuladas.
- Superfícies, bordas, acento de marca, espaçamento entre seções e ritmo de movimento passaram a ter tokens e classes compartilhados. Os acentos âmbar da Sprint e violeta da Academia permanecem semânticos; indigo é a marca e interação comum.
- O grid empilha a coluna auxiliar abaixo da área principal em telas estreitas. Builds de frontend/backend e smoke da API passaram; a revisão renderizada em navegador continua pendente porque CUA/Sky não estão disponíveis neste ambiente.

## Atualização após a terceira passada

- Kanban por status e colunas de etapa agora usam superfícies compartilhadas e cabeçalhos com borda/superfície derivados dos tokens claro/escuro. A faixa superior conserva a cor semântica da coluna; cartões, estados vazios e ações existentes foram preservados.
- Os sete modais de criação/adição agora compartilham painel, overlay e entrada curta. `prefers-reduced-motion` desativa as animações de página e modal junto das transições de card/imagem já cobertas.
- A grade de Projetos destaca visualmente o item mais recente quando há ao menos três resultados e usa uma capa mais alta; o restante mantém o mesmo card e metadados. Quatro capas originais recebem atribuição estável por projeto e são reutilizadas no card da Overview.
- Ainda falta revisar no navegador os crops reais, o equilíbrio da grade 2/3 colunas, contraste em claro/escuro e o comportamento de modais/quadros em mobile. Browser automatizado não está disponível nesta sessão, portanto a terceira passada foi validada estruturalmente e por build.
- Os assets seguem conceitualmente próximos entre si (cenários abstratos de progresso), e ainda não há arte específica para calendário, academia ou Sprint. A diferenciação por módulo deve vir de composição, conteúdo real e acentos semânticos, sem multiplicar efeitos ou fundos repetidos.
- Movimento atual é intencional e discreto (entrada de página/modal, elevação de card e escala de capa). Drag feedback, mudança de coluna, troca de rota e estados de carregamento precisam de desenho e revisão antes de adicionar animação adicional.

| Requisito | Situação após terceira passada |
| --- | --- |
| Tokens de superfície usados também em Kanban e colunas | Atendido estruturalmente; revisar contraste renderizado |
| Modais coesos com suporte a movimento reduzido | Atendido por estilos compartilhados; revisar foco/overflow em viewports reais |
| Hierarquia e variedade de cards de projeto | Melhorada com capa determinística e destaque do primeiro projeto; confirmar crop e regra de ordenação visualmente |
| Motion coeso e sem excesso | Base aplicada; feedback de drag/transição de estado ainda pendente |
| Revisão visual desktop/mobile, claro/escuro | Pendente por falta de navegador automatizado |

## Iteração: rail lateral e novas capas

- A navegação de desktop foi reduzida para uma rail de ícones com estado ativo, rótulos acessíveis e dica ao passar o mouse. O drawer mobile segue com rótulos completos.
- Sete capas adicionais foram geradas com ImageGen e salvas em `frontend/public/assets/project-cover-05.png` até `project-cover-11.png`. A série cobre estudo, criação, tecnologia, cultivo e planejamento, sem texto dentro da arte.
- A lista de capas cresceu de quatro para onze opções. Overview e cards carregam as imagens sob demanda.
- O build passou e a captura desktop confirmou a rail. A captura móvel simples não ativou emulação de dispositivo, então não foi usada para concluir a revisão mobile.

## Correção responsiva verificada

- A Overview agora restringe o grid externo a `w-full min-w-0`; hero e conteúdo interno também permitem encolher. No mobile, o cartão de foco e a ação ficam empilhados, títulos e contexto admitem quebra longa, e a faixa de foco mantém scroll horizontal interno.
- Os cards da faixa reduzem a largura em telas largas para que os três primeiros caibam integralmente na coluna principal, mantendo rolagem horizontal para itens seguintes e em touch/mobile.
- Reinspecionei capturas renderizadas com Chrome headless e emulação CDP nas dimensões 390x844 e 1440x900. Em ambos os tamanhos `document.documentElement.scrollWidth` e `document.body.scrollWidth` ficaram iguais à largura do viewport (390 e 1440). Em desktop, os três primeiros cards aparecem completos; no mobile, hero, texto do foco e botão cabem e quebram em linhas legíveis.
- Screenshots de verificação foram guardadas fora do repositório em `C:\Users\Kaue\AppData\Local\Temp\brainboard-final-mobile.png` e `C:\Users\Kaue\AppData\Local\Temp\brainboard-final-desktop.png`.
- Resta revisar outros módulos em tamanhos estreitos e verificar estados de erro/conteúdo extremo; esta captura cobre a Overview carregada em tema escuro. O teste de dimensões acima é uma checagem renderizada da página, não substitui revisão funcional completa.
