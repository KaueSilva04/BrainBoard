import { Router } from 'express';
import * as controller from './calendar.controller.js';

export const calendarRouter = Router();

// Appointments CRUD
calendarRouter.get('/api/appointments', controller.listAppointments);
calendarRouter.get('/api/appointments/:id', controller.getAppointmentById);
calendarRouter.post('/api/appointments', controller.createAppointment);
calendarRouter.patch('/api/appointments/:id', controller.updateAppointment);
calendarRouter.delete('/api/appointments/:id', controller.deleteAppointment);

// Unified Calendar Projection
calendarRouter.get('/api/calendar/events', controller.getCalendarEvents);
