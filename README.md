# 🧠 BrainBoard

**BrainBoard** é um sistema completo e inteligente de gestão pessoal, acadêmica e de projetos, projetado do zero para ser nativamente controlável por **Agentes de Inteligência Artificial** através do protocolo **MCP (Model Context Protocol)**.

![Status](https://img.shields.io/badge/Status-Active-success)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-gray)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)

---

## 🎯 Principais Funcionalidades

### 1. 📋 Gestão de Projetos, Colaboradores e Kanban
- **Autenticação e Equipes:** Contas de usuário, proprietário (`OWNER`) e convite de colaboradores (`COLLABORATOR`) por projeto, com atribuição de tarefas a responsáveis.
- **Quadro Kanban Dual (Por Status e Por Etapa):** Arraste e solte (`Drag-and-Drop`) tarefas entre etapas ou status, ou mova com 1 clique pelo seletor rápido.
- **Etiquetas (`Tags`) e Filtros Avançados:** Classifique tarefas com etiquetas coloridas e filtre todo o quadro ou cada etapa individualmente por etiqueta, status, responsável ou foco.
- **Foco / Sprint Semanal:** Isolamento rápido das tarefas prioritárias do projeto ou globais.

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
- *Para ver os detalhes, leia a documentação oficial: [`backend/MCP_DOCUMENTATION.md`](./backend/MCP_DOCUMENTATION.md).*

---

## 🛠️ Arquitetura e Tecnologias

O repositório está estruturado como um **Monorepo** contendo Front e Back na mesma base, facilitando orquestração e contexto para as IAs.

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide React (Ícones).
- **Backend:** Node.js, Express, TypeScript, Prisma ORM.
- **Banco de Dados:** PostgreSQL externo acessado pelo Prisma.
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
   *O Docker compilará o backend e o frontend. Configure `DATABASE_URL` para apontar para seu PostgreSQL antes de iniciar.*

3. **Acesse as aplicações:**
   - **Frontend (Interface):** `http://localhost:5173`
   - **Backend (API):** `http://localhost:3000`
   - **Servidor MCP (para conectar a IA):** `http://localhost:3000/mcp/sse`

---

## 🤖 Como conectar sua IA (Cursor / Roo Code)

Se você utiliza assistentes habilitados para MCP, adicione a seguinte configuração no seu cliente (ex: Claude Desktop ou Roo Code):

- **Protocolo:** SSE (Server-Sent Events)
- **URL:** `http://localhost:3000/mcp/sse`

Após a conexão, o cliente recebe o catálogo de ferramentas MCP disponibilizadas pelo backend.

---
*Construído com automação e IA em mente.*
