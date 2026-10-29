# Instruções para Agentes — BrainBoard (`AGENT.md`)

## Regras Obrigatórias de Git

1. **Proibido `git push`:** É terminantemente **proibido** executar `git push` ou qualquer comando equivalente que envie commits, branches ou tags para o repositório remoto. O envio para produção/remoto é responsabilidade exclusiva do usuário.
2. **Commit obrigatório a cada entrega relevante:** Sempre que implementar, corrigir ou concluir algo relevante no código, é **necessário realizar um `git commit` local** (`git add` + `git commit -m "..."`) registrando claramente a alteração após validar o build/testes.
3. **Preservação do trabalho local:** Preserve alterações locais existentes e nunca execute comandos destrutivos (`git reset --hard`, `git checkout -- .`) sem solicitação explícita do usuário.

## Execução e Qualidade

- Antes de realizar o commit de alterações no frontend ou backend, valide que o build (`npm run build`) passa sem erros de TypeScript.
- Execute ferramentas de forma silenciosa e mantenha o número de subagentes enxuto e focado.
