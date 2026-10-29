import type { Request, Response } from 'express';
import { appointmentService } from './appointment.service.js';
import { calendarService } from './calendar.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export const listAppointments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const { startDate, endDate, isCompleted } = req.query;
    const appointments = await appointmentService.listAppointments(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
      isCompleted: isCompleted !== undefined ? isCompleted === 'true' : undefined,
    });
    res.json(appointments);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const id = String(req.params.id);
    const appointment = await appointmentService.getAppointmentById(id, userId);
    res.json(appointment);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const { title, startTime, endTime, description, locationOrLink } = req.body;
    const appointment = await appointmentService.createAppointment(userId, {
      title,
      startTime,
      endTime,
      description,
      locationOrLink,
    });
    res.status(201).json(appointment);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const id = String(req.params.id);
    const { title, startTime, endTime, description, locationOrLink, isCompleted } = req.body;
    const appointment = await appointmentService.updateAppointment(id, userId, {
      title,
      startTime,
      endTime,
      description,
      locationOrLink,
      isCompleted,
    });
    res.json(appointment);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const id = String(req.params.id);
    await appointmentService.deleteAppointment(id, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    const { startDate, endDate, includeCompleted, projectId } = req.query;
    const events = await calendarService.getCalendarEvents({
      startDate: startDate as string,
      endDate: endDate as string,
      includeCompleted: includeCompleted === 'true',
      projectId: projectId ? String(projectId).trim() : undefined,
      userId,
    });
    res.json(events);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
