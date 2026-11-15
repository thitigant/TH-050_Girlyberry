import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  createSurveySchema,
  updateSurveySchema,
  questionInputSchema,
} from '../validators/surveyValidator.js';
import { surveyService, MAX_SURVEY_QUESTIONS } from '../services/surveyService.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { Role } from '@prisma/client';

export class SurveyController {
  async createSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      if (Array.isArray(req.body?.questions) && req.body.questions.length > MAX_SURVEY_QUESTIONS) {
        res.status(422).json({
          error: {
            code: 'QUESTION_LIMIT_EXCEEDED',
            message: `A survey can have at most ${MAX_SURVEY_QUESTIONS} questions (BR-03)`,
          },
        });
        return;
      }

      const parsed = createSurveySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed for survey creation',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const survey = await surveyService.createDraftSurvey(req.user.id, parsed.data);
      res.status(201).json({
        data: survey,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = updateSurveySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed for survey update',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const updated = await surveyService.updateDraftSurvey(surveyId, req.user!.id, parsed.data);
      res.status(200).json({ data: updated });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async addQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = questionInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed for question creation',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const createdQuestion = await surveyService.addQuestionToSurvey(
        surveyId,
        req.user!.id,
        parsed.data
      );
      res.status(201).json({ data: createdQuestion });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async getSurveys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let surveys;
      switch (req.user!.role) {
        case Role.RESPONDENT:
          surveys = await surveyService.getPublishedSurveysForRespondent(req.user!.id);
          break;
        case Role.SURVEY_OWNER:
          surveys = await surveyService.getOwnerSurveys(req.user!.id);
          break;
        default: {
          const _exhaustiveCheck: never = req.user!.role;
          throw new AppError(403, 'FORBIDDEN_ROLE', `Role '${_exhaustiveCheck}' is not authorized to list surveys`);
        }
      }

      res.status(200).json({
        data: surveys,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async getSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.getSurveyById(surveyId, req.user?.id);
      res.status(200).json({
        data: survey,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async publishSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.publishSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: survey });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async closeSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.closeSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: survey });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async deleteSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await surveyService.deleteSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: result });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }
}

export const surveyController = new SurveyController();
