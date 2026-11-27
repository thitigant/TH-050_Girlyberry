import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { exportService, ExportFormat } from '../services/exportService.js';
import { AppError, handleControllerError } from '../utils/errors.js';

export class ExportController {
  /**
   * GET /api/surveys/:id/export?format=csv|json
   * F-19: Survey Results Export (AC-38, AC-39, AC-40)
   */
  async exportSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const rawFormat = (req.query.format as string | undefined)?.toLowerCase() ?? 'json';

      if (rawFormat !== 'json' && rawFormat !== 'csv') {
        throw new AppError(
          400,
          'INVALID_EXPORT_FORMAT',
          `Unsupported export format '${rawFormat}'. Use 'json' or 'csv'.`,
        );
      }

      const format = rawFormat as ExportFormat;
      const result = await exportService.exportSurveyResults(surveyId, req.user!.id, format);

      if (result.type === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="survey-${surveyId}-results.json"`,
        );
        res.status(200).json({ data: result.data });
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="survey-${surveyId}-results.csv"`,
        );
        res.status(200).send(result.csv);
      }
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }
}

export const exportController = new ExportController();
