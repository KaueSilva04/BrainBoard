import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      stages: {
        include: {
          tasks: true
        }
      }
    }
  });
  console.log('Total projects:', projects.length);
  for (const p of projects) {
    console.log(`- [${p.id}] ${p.title} (${p.type}) | Stages: ${p.stages.length}, Tasks: ${p.stages.reduce((acc, s) => acc + s.tasks.length, 0)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
