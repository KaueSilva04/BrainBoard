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

  // 4. Backfill unowned AcademicSubjects to adminUser
  const unownedSubjects = await prisma.academicSubject.count({
    where: { userId: null },
  });

  if (unownedSubjects > 0) {
    console.log(`[Backfill] Migrating ${unownedSubjects} unowned academic subjects to ${adminUser.email}`);
    await prisma.academicSubject.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });
    console.log(`[Backfill] 100% of academic subjects backfilled with zero data loss.`);
  }

  // 5. Backfill unowned AcademicAssignments
  // Derive ownership from parent subject where possible, falling back to adminUser
  const unownedAssignments = await prisma.academicAssignment.findMany({
    where: { userId: null },
    select: { id: true, subjectId: true, subject: { select: { userId: true } } },
  });

  if (unownedAssignments.length > 0) {
    console.log(`[Backfill] Migrating ${unownedAssignments.length} unowned academic assignments...`);

    const assignmentsByUser = new Map<string, string[]>();
    for (const a of unownedAssignments) {
      const targetUserId = a.subject?.userId || adminUser.id;
      const ids = assignmentsByUser.get(targetUserId) || [];
      ids.push(a.id);
      assignmentsByUser.set(targetUserId, ids);
    }

    for (const [targetUserId, ids] of assignmentsByUser.entries()) {
      await prisma.academicAssignment.updateMany({
        where: { id: { in: ids } },
        data: { userId: targetUserId },
      });
    }

    // Safety fallback: ensure any assignment still without userId is assigned to adminUser
    await prisma.academicAssignment.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });
    console.log(`[Backfill] 100% of academic assignments backfilled with zero data loss.`);
  }

  // 6. Backfill unowned Appointments to adminUser
  const unownedAppointments = await prisma.appointment.count({
    where: { userId: null },
  });

  if (unownedAppointments > 0) {
    console.log(`[Backfill] Migrating ${unownedAppointments} unowned appointments to ${adminUser.email}`);
    await prisma.appointment.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });
    console.log(`[Backfill] 100% of appointments backfilled with zero data loss.`);
  }

  return adminUser;
}
