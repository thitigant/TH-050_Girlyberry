import { z } from 'zod';

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1, 'Question text cannot be empty').max(500, 'Question text too long').optional(),
    prompt: z.string().trim().min(1, 'Question prompt cannot be empty').max(500, 'Question prompt too long').optional(),
    type: z.enum(['SINGLE_CHOICE', 'RATING', 'SHORT_TEXT']).optional(),
    questionType: z.enum(['SINGLE_CHOICE', 'RATING', 'SHORT_TEXT', 'TEXT']).optional(),
    isRequired: z.boolean().optional().default(true),
    displayOrder: z.number().int().optional(),
    orderIndex: z.number().int().optional(),
    options: z.array(z.string().trim().min(1, 'Option label cannot be empty')).optional(),
  })
  .transform((val) => {
    const resolvedType =
      val.type || (val.questionType === 'TEXT' ? 'SHORT_TEXT' : val.questionType) || 'SHORT_TEXT';
    return {
      text: (val.text || val.prompt || '').trim(),
      type: resolvedType as 'SINGLE_CHOICE' | 'RATING' | 'SHORT_TEXT',
      isRequired: val.isRequired ?? true,
      displayOrder: val.displayOrder ?? val.orderIndex,
      options: val.options,
    };
  })
  .superRefine((val, ctx) => {
    if (!val.text || val.text.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Question text cannot be empty',
        path: ['text'],
      });
    }
    if (val.type === 'SINGLE_CHOICE') {
      if (!val.options || val.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single choice questions must have at least 2 options',
          path: ['options'],
        });
      } else if (val.options.length > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single choice questions cannot exceed 10 options',
          path: ['options'],
        });
      } else {
        const uniqueSet = new Set(val.options.map((opt) => opt.toLowerCase()));
        if (uniqueSet.size !== val.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Single choice options must be unique',
            path: ['options'],
          });
        }
      }
    }
  });

export const createSurveySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be between 5 and 120 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  responseMode: z.enum(['IDENTIFIED', 'ANONYMOUS']).optional().default('IDENTIFIED'),
  questions: z
    .array(questionInputSchema)
    .max(25, 'A survey can have at most 25 questions (BR-03)')
    .optional()
    .default([]),
});

export const updateSurveySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be between 5 and 120 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .optional(),
  description: z.string().trim().max(1000).optional(),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
