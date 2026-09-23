import type { Request, Response } from 'express';
import { sprintService } from '../services/sprint.service.js';

export class SprintController {
  async getSprints(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const sprints = await sprintService.getProjectSprints(projectId);
      res.json(sprints);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar sprints do projeto' });
    }
  }

  async createSprint(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const sprint = await sprintService.createSprint(projectId, req.body);
      res.status(201).json(sprint);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar sprint' });
    }
  }

  async updateSprint(req: Request, res: Response) {
    try {
      const sprintId = req.params.sprintId as string;
      const sprint = await sprintService.updateSprint(sprintId, req.body);
      res.json(sprint);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar sprint' });
    }
  }

  async deleteSprint(req: Request, res: Response) {
    try {
      const sprintId = req.params.sprintId as string;
      await sprintService.deleteSprint(sprintId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar sprint' });
    }
  }
}

export const sprintController = new SprintController();
