# Instruções para agentes — BrainBoard

## Git

- Os agentes têm autorização para executar comandos Git locais necessários ao trabalho no repositório, incluindo consultar o estado e o histórico, criar ou trocar branches, preparar alterações e criar commits.
- É proibido executar `git push` ou qualquer operação equivalente que envie commits, branches ou tags para um repositório remoto. Deixe a publicação para o usuário.
- Preserve as alterações locais já existentes. Não descarte nem sobrescreva trabalho do usuário sem instrução explícita.

## Execução

- Execute ferramentas de forma silenciosa. Não abra janelas visíveis do PowerShell ou CMD.

## Redesign

- Priorize os cinco agentes persistentes definidos em `.codex/`: `design_orchestrator`, `product_direction_researcher`, `design_reviewer`, `frontend_coder` e `backend_coder`. O `design_orchestrator` pode criar subagentes temporários focados quando isso ajudar; limite a **10 subagentes no total por ciclo**, contando os agentes de projeto delegados e todos os subagentes filhos. O orquestrador não entra nessa contagem. Não crie arquivos persistentes de agente sem solicitação do usuário.
- O fluxo de validação e seu limite de uma revisão integrada, uma correção agrupada e uma confirmação final estão documentados em [REDESIGN_PLAN.md](REDESIGN_PLAN.md), na seção **Ciclo contínuo e limitado de melhoria do frontend**.

- Em tarefas de design do BrainBoard, o `design_orchestrator` deve começar por [REDESIGN_BRIEF.md](REDESIGN_BRIEF.md), conferir as referências atuais em `img/` e coordenar os demais agentes conforme a etapa descrita ali.
- Antes de implementar o redesign, os agentes devem ler [REDESIGN_PLAN.md](REDESIGN_PLAN.md) e conferir as decisões mais recentes do usuário. A reforma cobre o sistema inteiro; ideias ainda indisponíveis aparecem como cards identificados **Em breve**, sem dados fictícios.
- Na fase de imagens, use a skill `imagegen` para gerar assets originais de banners e cards. O frontend deve animar cards e imagens com uma linguagem comum, mantendo acessibilidade, desempenho e suporte a movimento reduzido.
