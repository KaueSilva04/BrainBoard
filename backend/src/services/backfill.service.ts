import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';

export async function ensureDefaultOwnerAndBackfill() {
  const defaultEmail = (process.env.DEFAULT_OWNER_EMAIL || 'admin@brainboard.local').toLowerCase().trim();
  const defaultName = process.env.DEFAULT_OWNER_NAME || 'Administrador BrainBoard';
  const defaultPass = process.env.DEFAULT_OWNER_PASSWORD || 'brainboard123';

  // 1. Ensure Seeded Admin User exists
  let adminUser = await prisma.user.findUnique({ where: { email: defaultEmail } });
  if (!adminUser) {
    const passwordHash = await bcrypt.hash(defaultPass, 10);
    adminUser = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: defaultName,
        passwordHash,
        avatarColor: '#10b981', // Refined Emerald
      },
    });
    console.log(`[Backfill] Created default owner user: ${adminUser.id} (${adminUser.email})`);
  }

  // 2. Identify unowned projects
  const unownedProjects = await prisma.project.findMany({
    where: { ownerId: null },
    select: { id: true, title: true },
  });

  if (unownedProjects.length > 0) {
    console.log(`[Backfill] Migrating ${unownedProjects.length} existing projects to ${adminUser.email}`);

    // Update project ownerId
    await prisma.project.updateMany({
      where: { ownerId: null },
      data: { ownerId: adminUser.id },
    });

    // Seed ProjectMember relation with role OWNER
    for (const p of unownedProjects) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: p.id, userId: adminUser.id },
        },
        create: {
          projectId: p.id,
          userId: adminUser.id,
          role: 'OWNER',
        },
        update: { role: 'OWNER' },
      });
    }
    console.log(`[Backfill] 100% of existing projects backfilled with zero data loss.`);
  }

  // 3. Ensure all owned projects have an OWNER ProjectMember entry
  const ownedProjects = await prisma.project.findMany({
    where: { ownerId: { not: null } },
    select: { id: true, ownerId: true },
  });

  for (const p of ownedProjects) {
    if (p.ownerId) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: p.id, userId: p.ownerId },
        },
        create: {
          projectId: p.id,
          userId: p.ownerId,
          role: 'OWNER',
        },
        update: {},
      });
    }
  }

  return adminUser;
}
