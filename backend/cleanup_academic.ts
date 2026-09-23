import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAcademicProjects() {
  console.log('Cleaning up old ACADEMIC projects...');
  try {
    const result = await prisma.project.deleteMany({
      where: { type: 'ACADEMIC' },
    });
    console.log(`Deleted ${result.count} old academic projects.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAcademicProjects();
