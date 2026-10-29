import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import { parseIsoDate } from '../shared/date.utils.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentFilterOptions,
} from './calendar.types.js';

export class AppointmentService {
  async listAppointments(userId: string, filters?: AppointmentFilterOptions) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    const where: any = { userId };

    if (filters?.startDate) {
      const start = parseIsoDate(filters.startDate, 'startDate');
      where.startTime = { ...(where.startTime || {}), gte: start };
    }

    if (filters?.endDate) {
      const end = parseIsoDate(filters.endDate, 'endDate');
      where.endTime = { ...(where.endTime || {}), lte: end };
    }

    if (filters?.isCompleted !== undefined) {
      where.isCompleted = Boolean(filters.isCompleted);
    }

    return await prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async getAppointmentById(id: string, userId: string) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Appointment ID is required');
    }
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    return appointment;
  }

  async createAppointment(userId: string, data: CreateAppointmentInput) {
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    if (!data.startTime || !data.endTime) {
      throw new ValidationError('startTime and endTime are required');
    }

    const startTime = parseIsoDate(data.startTime, 'startTime');
    const endTime = parseIsoDate(data.endTime, 'endTime');

    if (startTime.getTime() >= endTime.getTime()) {
      throw new ValidationError('startTime must be before endTime');
    }

    return await prisma.appointment.create({
      data: {
        title: data.title.trim(),
        startTime,
        endTime,
        description:
          data.description !== undefined && data.description !== null
            ? String(data.description).trim()
            : null,
        locationOrLink:
          data.locationOrLink !== undefined && data.locationOrLink !== null
            ? String(data.locationOrLink).trim()
            : null,
        userId,
      },
    });
  }

  async updateAppointment(id: string, userId: string, data: UpdateAppointmentInput) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Appointment ID is required');
    }
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    const current = await prisma.appointment.findFirst({
      where: { id, userId },
    });
    if (!current) {
      throw new NotFoundError('Appointment not found');
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description =
        data.description === null ? null : String(data.description).trim();
    }

    if (data.locationOrLink !== undefined) {
      updateData.locationOrLink =
        data.locationOrLink === null ? null : String(data.locationOrLink).trim();
    }

    if (data.isCompleted !== undefined) {
      updateData.isCompleted = Boolean(data.isCompleted);
    }

    let newStart = current.startTime;
    let newEnd = current.endTime;

    if (data.startTime !== undefined) {
      newStart = parseIsoDate(data.startTime, 'startTime');
      updateData.startTime = newStart;
    }

    if (data.endTime !== undefined) {
      newEnd = parseIsoDate(data.endTime, 'endTime');
      updateData.endTime = newEnd;
    }

    if (newStart.getTime() >= newEnd.getTime()) {
      throw new ValidationError('startTime must be before endTime');
    }

    try {
      return await prisma.appointment.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Appointment not found');
      }
      throw error;
    }
  }

  async deleteAppointment(id: string, userId: string) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Appointment ID is required');
    }
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    const current = await prisma.appointment.findFirst({
      where: { id, userId },
    });
    if (!current) {
      throw new NotFoundError('Appointment not found');
    }

    try {
      return await prisma.appointment.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Appointment not found');
      }
      throw error;
    }
  }
}

export const appointmentService = new AppointmentService();
