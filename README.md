# 🧠 BrainBoard

**BrainBoard** é um sistema completo e inteligente de gestão pessoal, acadêmica e de projetos, projetado do zero para ser nativamente controlável por **Agentes de Inteligência Artificial** através do protocolo **MCP (Model Context Protocol)**.

![Status](https://img.shields.io/badge/Status-Active-success)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-gray)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)

---

## 🎯 Principais Funcionalidades

### 1. 📋 Gestão de Projetos e Kanban
- Gerenciamento completo de projetos (criação, edição e exclusão).
- Quadro Kanban intuitivo com colunas personalizáveis (Etapas/Stages).
- Criação de Tarefas, subtarefas (checklists) e alteração de status via drag-and-drop.
- **Sprint Semanal:** Filtro inteligente para isolar as tarefas que devem ser entregues na semana atual.

### 2. 🎓 Área Acadêmica
- Módulo isolado focado em estudantes e produtividade universitária.
- Cadastro de **Disciplinas** (com cores personalizadas e professores).
- Criação de **Atividades** (Provas, Trabalhos, Apresentações, etc.) agrupadas como uma To-Do list por matéria, integradas a datas de entrega.

### 3. 📅 Produtividade Diária (M2)
- Gestão de compromissos com horário marcado (início, fim e links).
- Visão global consolidando prazos de projetos e entregas acadêmicas para os próximos 7 dias.

### 4. 🤖 Integração Nativa com IA (Servidor MCP)
O verdadeiro poder do BrainBoard. O backend expõe um servidor **MCP via SSE (Server-Sent Events)** na porta `3000`. Isso permite que IAs como Cursor, Claude Desktop e Roo Code controlem o sistema.
- A IA pode ler o contexto do projeto, alterar a lógica de negócios e ver o que está no Kanban.
- A IA pode criar tarefas em lote, manipular Sprints e alterar disciplinas sem precisar que você toque no mouse.
- Respostas estruturadas em JSON garantem alta precisão nas automações.
- *Para ver os detalhes, leia a documentação oficial: [`MCP_DOCUMENTATION.md`](./MCP_DOCUMENTATION.md).*

---

## 🛠️ Arquitetura e Tecnologias

O repositório está estruturado como um **Monorepo** contendo Front e Back na mesma base, facilitando orquestração e contexto para as IAs.

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide React (Ícones).
- **Backend:** Node.js, Express, TypeScript, Prisma ORM.
- **Banco de Dados:** PostgreSQL (armazenamento persistente) e Redis (fila/cache).
- **Infraestrutura:** Orquestrado via `docker-compose`.

---

## 🚀 Como Rodar o Projeto Localmente

É extremamente simples inicializar todo o ecossistema BrainBoard. Tudo o que você precisa é ter o **Docker** e o **Docker Compose** instalados na sua máquina.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/KaueSilva04/BrainBoard.git
   cd BrainBoard
   ```

2. **Inicie os containers:**
   Na raiz do projeto, execute o comando:
   ```bash
   docker-compose up --build -d
   ```
   *O Docker fará o download das imagens do Postgres/Redis e compilará o Backend e o Frontend automaticamente.*

3. **Acesse as aplicações:**
   - **Frontend (Interface):** `http://localhost:5173`
   - **Backend (API):** `http://localhost:3000`
   - **Servidor MCP (para conectar a IA):** `http://localhost:3000/mcp/sse`

---

## 🤖 Como conectar sua IA (Cursor / Roo Code)

Se você utiliza assistentes habilitados para MCP, adicione a seguinte configuração no seu cliente (ex: Claude Desktop ou Roo Code):

- **Protocolo:** SSE (Server-Sent Events)
- **URL:** `http://localhost:3000/mcp/sse`

Imediatamente após a conexão, a IA receberá o catálogo atualizado com 23 ferramentas disponíveis para manipular o BrainBoard a seu favor!

---
*Construído com automação e IA em mente.*
