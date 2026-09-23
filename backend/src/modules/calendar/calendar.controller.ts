import type { Request, Response } from 'express';
import { appointmentService } from './appointment.service.js';
import { calendarService } from './calendar.service.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, isCompleted } = req.query;
    const appointments = await appointmentService.listAppointments({
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
    const id = String(req.params.id);
    const appointment = await appointmentService.getAppointmentById(id);
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
    const { title, startTime, endTime, description, locationOrLink } = req.body;
    const appointment = await appointmentService.createAppointment({
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
    const id = String(req.params.id);
    const { title, startTime, endTime, description, locationOrLink, isCompleted } = req.body;
    const appointment = await appointmentService.updateAppointment(id, {
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
    const id = String(req.params.id);
    await appointmentService.deleteAppointment(id);
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
    const { startDate, endDate, includeCompleted, projectId } = req.query;
    const events = await calendarService.getCalendarEvents({
      startDate: startDate as string,
      endDate: endDate as string,
      includeCompleted: includeCompleted === 'true',
      projectId: projectId ? String(projectId).trim() : undefined,
    });
    res.json(events);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
