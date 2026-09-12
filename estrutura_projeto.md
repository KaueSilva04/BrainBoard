# 🧠 Estrutura do Projeto FocusTask

Com base no documento inicial, estruturei a arquitetura, o banco de dados, as regras de negócio e as etapas de desenvolvimento do **FocusTask** (seu sistema de Kanban pessoal com integração de IA via MCP). 

Por favor, revise os pontos abaixo. Assim que aprovar, iniciaremos o desenvolvimento da **Etapa 1**.

---

## 1. 🗄️ Estrutura do Banco de Dados (PostgreSQL + Prisma)

O modelo de dados será simples e relacional, utilizando o Prisma ORM para facilitar a comunicação com o banco PostgreSQL.

```prisma
// Enumerações para padronizar os dados
enum Category {
  PROJECT
  COLLEGE
  PERSONAL
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}

// Tabela Principal
model Task {
  id          String    @id @default(uuid())
  title       String
  description String?   // Opcional: para detalhes da tarefa
  category    Category  // Projetos, Faculdade, Pessoais
  status      Status    @default(TODO) // Estágio no Kanban
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relacionamento
  subtasks    Subtask[]
}

// Tabela de Subtarefas
model Subtask {
  id          String   @id @default(uuid())
  title       String
  isDone      Boolean  @default(false)
  
  // Chave estrangeira
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

---

## 2. ⚙️ Lógica de Negócio e Integração (Backend Node.js)

O backend terá duas responsabilidades principais e rodará na mesma aplicação:

### A. Servidor MCP para a IA (Transporte Remoto)
Diferente dos servidores MCP locais que rodam via linha de comando (`stdio`), este usará a web (`SSE` + `HTTP POST`) para que a IA da sua máquina acesse seu servidor remoto.
**Ferramentas (Tools) que o MCP vai expor para a IA:**
*   `list_tasks`: Permite à IA visualizar suas tarefas do Kanban, com filtros por categoria ou status.
*   `create_task`: A IA poderá criar tarefas em qualquer categoria.
*   `move_task`: A IA poderá alterar o status (ex: de TODO para DONE).
*   `add_subtask`: A IA poderá quebrar uma tarefa grande em pequenas subtarefas.
*   `toggle_subtask`: Marcar uma subtarefa como feita.

### B. API para o Frontend Visual
O mesmo servidor fornecerá endpoints (ex: rotas Express REST ou via o próprio protocolo MCP web) para o seu frontend web construído em React, garantindo que tudo funcione em tempo real.

---

## 3. 🚀 Etapas de Desenvolvimento

O projeto será construído de forma iterativa e modular. Aqui está o roteiro sugerido:

### 📍 Etapa 1: Infraestrutura Básica e Banco de Dados
*   Criação do arquivo `docker-compose.yml` inicial (focado em subir apenas o banco de dados PostgreSQL).
*   Setup do projeto Node.js (TypeScript) e inicialização do Prisma.
*   Criação e execução da primeira *migration* para gerar as tabelas no banco de dados.

### 📍 Etapa 2: Construção do Servidor (API + MCP)
*   Configuração do servidor web (Express ou similar).
*   Implementação do transporte MCP usando `SSE` (Server-Sent Events) para envio de mensagens da IA e HTTP POST para recebimento de requisições.
*   Criação e registro das ferramentas de IA (`create_task`, `move_task`, etc.) conectadas diretamente ao banco via Prisma.

### 📍 Etapa 3: Construção do Frontend Visual (React)
*   Setup do projeto com React, Vite e TailwindCSS.
*   Criação do layout estilo "Kanban" (colunas e cards).
*   Integração do frontend com o backend para listar, criar e mover as tarefas de forma visual na sua interface de uso.

### 📍 Etapa 4: Dockerização Completa e Preparação para Deploy
*   Criação do `Dockerfile` para o Backend.
*   Criação do `Dockerfile` para o Frontend.
*   Atualização do `docker-compose.yml` principal para rodar todo o ecossistema (PostgreSQL + Backend + Frontend) de uma só vez.
*   Instruções finais de como fazer o deploy na sua VPS.
