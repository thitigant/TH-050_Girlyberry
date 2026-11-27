import { prisma } from '../db/prisma.js';
import { QuestionType } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { analyticsService } from './analyticsService.js';

export type ExportFormat = 'json' | 'csv';

export class ExportService {
  /**
   * F-19: Export survey aggregated results as JSON or CSV (AC-38, AC-39, AC-40)
   * NFR-12: Zero respondent PII in exported datasets.
   */
  async exportSurveyResults(surveyId: string, requestingUserId: string, format: ExportFormat) {
    // Re-use analytics service for consistent aggregate data (ownership check inside)
    const summary = await analyticsService.getSurveySummary(surveyId, requestingUserId);

    // Also fetch survey meta for responseMode & status
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { responseMode: true, status: true, title: true },
    });

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      format,
      surveyId: summary.surveyId,
      title: summary.title,
      status: survey!.status,
      responseMode: survey!.responseMode,
      totalResponses: summary.totalResponses,
      questions: summary.questions,
    };

    if (format === 'json') {
      return { type: 'json' as const, data: exportPayload };
    }

    // Build CSV (RFC-4180)
    const rows: string[] = [
      'questionId,questionOrder,questionType,prompt,metricOrOption,countOrScore,percentage',
    ];

    summary.questions.forEach((q: any, idx: number) => {
      const base = [
        q.questionId,
        String(idx + 1),
        q.questionType,
        csvEscape(q.prompt),
      ];

      if (q.questionType === QuestionType.RATING || (q.summary as any).averageScore !== undefined) {
        const s = q.summary as any;
        // averageScore row
        rows.push([...base, 'averageScore', String(s.averageScore ?? 0), ''].join(','));
        // distribution rows
        if (s.distribution) {
          for (const [star, count] of Object.entries(s.distribution)) {
            const pct =
              s.totalRatings > 0
                ? ((Number(count) / s.totalRatings) * 100).toFixed(1)
                : '0.0';
            rows.push([...base, `star_${star}`, String(count), pct + '%'].join(','));
          }
        }
      } else if ((q.summary as any).options !== undefined) {
        const s = q.summary as any;
        for (const opt of s.options) {
          rows.push(
            [...base, csvEscape(opt.label), String(opt.count), opt.percentage + '%'].join(','),
          );
        }
      } else {
        // SHORT_TEXT — just count
        const s = q.summary as any;
        rows.push([...base, 'totalAnswers', String(s.totalAnswers ?? 0), ''].join(','));
      }
    });

    return { type: 'csv' as const, csv: rows.join('\r\n') };
  }
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const exportService = new ExportService();
