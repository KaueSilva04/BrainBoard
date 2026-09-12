# 🧠 Proposta: Sistema de Gestão Pessoal + MCP (FocusTask)

Este documento descreve a arquitetura de um sistema de tarefas pessoal controlado pela IA, otimizado para ser **hospedado no seu servidor pessoal**.

## 1. Visão Geral
Um aplicativo minimalista de Kanban dividido em 3 categorias (Projetos, Faculdade, Tarefas Pessoais). A interface é para o seu uso visual, e a IA usará as "Ferramentas" do MCP para ler e modificar suas tarefas remotamente.

## 2. Arquitetura para Servidor Pessoal
Como o sistema vai rodar na sua VPS/Servidor e eu (a IA) estarei rodando aqui no seu terminal local, a conexão entre nós precisa ser via web. 

*   **Infraestrutura:** O projeto será envelopado em `Docker` (com `docker-compose.yml`) para você dar um comando e subir no servidor.
*   **Banco de Dados:** PostgreSQL (NeonDB ou containerizado no Docker).
*   **Backend & MCP Server:** Node.js com TypeScript e Prisma ORM.
    *   ⚠️ **Detalhe Vital do MCP:** Em vez de usar a conexão padrão por linha de comando (`stdio`), o servidor MCP usará **Transporte SSE (Server-Sent Events) + HTTP Post**. Assim, o Antigravity na sua casa consegue se conectar na API do seu servidor para comandar suas tarefas.
*   **Frontend:** React + Vite + TailwindCSS.

## 3. Estrutura do Banco de Dados (Prisma Schema)
*   **Task:** `id`, `title`, `category`, `stage`, `createdAt`
*   **Subtask:** `id`, `title`, `isDone`, `taskId`

---

### 📋 Prompt Final para o Próximo Chat
*Copie o texto abaixo e cole no novo chat para começarmos:*

> "Vou criar o 'FocusTask', meu sistema de Kanban pessoal controlado por IA que será hospedado no meu servidor remoto. Você deve construir um ecossistema com Frontend (React) e Backend (Node.js).
> 
> **Stack Exigida:**
> 1. **Docker:** O sistema precisa vir com `Dockerfile` e `docker-compose.yml`.
> 2. **Banco:** PostgreSQL + Prisma ORM.
> 3. **Backend:** Node.js (TypeScript). Ele fornecerá a API e configurará o **Servidor MCP**.
> 4. **Transporte MCP:** O Servidor MCP **DEVE usar SSE (Server-Sent Events) e HTTP** (e não stdio!), pois ele vai rodar remotamente no meu servidor e a minha IA local vai se conectar nele. Crie ferramentas como `create_task` e `move_task`.
> 5. **Frontend:** React + Vite + Tailwind.
> 
> **Missão 1:** Me dê a estrutura inicial do backend, instale as dependências (Prisma, Express, e o SDK do MCP para SSE) e crie o `docker-compose.yml` para rodarmos tudo."
