import { describe, it, expect } from 'vitest';
import { createSurveySchema } from '../src/validators/surveyValidator.js';

describe('Lab 6 Part C: UAT Defect Triage & Resolution (#41, #42)', () => {
  describe('Defect 1: Title Minimum Length Boundary (BR-02)', () => {
    it('TEST-UAT-01: Rejects survey titles shorter than 5 characters (e.g. "Test") with validation failure', () => {
      const result = createSurveySchema.safeParse({
        title: 'Test', // 4 characters
        questions: [{ text: 'Question 1', type: 'RATING', isRequired: true }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message);
        expect(errorMessages.some((msg) => msg.includes('5 and 150'))).toBe(true);
      }
    });

    it('TEST-UAT-02: Accepts survey title with exact boundary length of 5 characters', () => {
      const result = createSurveySchema.safeParse({
        title: 'Valid', // exactly 5 characters
        questions: [{ text: 'Question 1', type: 'RATING', isRequired: true }],
      });

      expect(result.success).toBe(true);
    });
  });
});
