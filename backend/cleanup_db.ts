import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanDB() {
  const allProjects = await prisma.project.findMany();
  let deletedCount = 0;
  
  for (const project of allProjects) {
    const isTestProject = 
      project.title.includes('E2E_Test_Project') ||
      project.title === 'Rapid Sprint Delivery Workflow' ||
      project.title === 'Project Phoenix: Autonomous Cloud Infrastructure' ||
      project.title === 'SOC2 Compliance & Audit Trail Project' ||
      project.title === 'Enum Validation Base' ||
      project.title === 'Stage Cascade Project' ||
      project.title === 'Task Cascade Project' ||
      project.title === 'Multi-Stage Isolation Project';
      
    if (isTestProject) {
      await prisma.project.delete({ where: { id: project.id } });
      deletedCount++;
      console.log(`Deleted test project: ${project.title}`);
    }
  }
  
  console.log(`Cleanup complete! Deleted ${deletedCount} mock/test projects.`);
}

cleanDB().catch(console.error).finally(() => prisma.$disconnect());
