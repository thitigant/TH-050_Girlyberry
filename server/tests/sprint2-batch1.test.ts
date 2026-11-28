import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import { SurveyStatus } from '@prisma/client';

describe('Sprint 2 Batch 1: F-13 Anonymous Mode, F-15 Scheduled Expiry & F-17 Duplication (Issue #38)', () => {
  let owner1Token: string;
  let owner2Token: string;
  let student1Token: string;
  let student2Token: string;
  let owner1Id: string;
  let student1Id: string;
  let student2Id: string;

  const createdSurveyIds: string[] = [];

  beforeAll(async () => {
    const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
    const owner2 = await prisma.user.findUnique({ where: { email: 'owner2@unipulse.edu' } });
    const student1 = await prisma.user.findUnique({ where: { email: 'student1@unipulse.edu' } });
    const student2 = await prisma.user.findUnique({ where: { email: 'student2@unipulse.edu' } });

    if (!owner1 || !owner2 || !student1 || !student2) {
      throw new Error('Seed accounts missing. Run npm run db:seed first.');
    }

    owner1Id = owner1.id;
    student1Id = student1.id;
    student2Id = student2.id;

    owner1Token = signToken(owner1).token;
    owner2Token = signToken(owner2).token;
    student1Token = signToken(student1).token;
    student2Token = signToken(student2).token;
  });

  afterAll(async () => {
    if (createdSurveyIds.length > 0) {
      await prisma.answer.deleteMany({
        where: { Response: { surveyId: { in: createdSurveyIds } } },
      });
      await prisma.response.deleteMany({
        where: { surveyId: { in: createdSurveyIds } },
      });
      await prisma.survey.deleteMany({
        where: { id: { in: createdSurveyIds } },
      });
    }
    await prisma.$disconnect();
  });

  // ===========================================================================
  // F-13: Anonymous Response Mode (AC-23, AC-24, AC-25)
  // ===========================================================================
  describe('F-13 Anonymous Response Mode', () => {
    let anonSurveyId: string;
    let anonRatingQId: string;
    let anonTextQId: string;

    it('TEST-35 (AC-23): Owner creates draft survey with responseMode = ANONYMOUS', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Anonymous Workshop Feedback',
          description: 'Candid anonymous feedback',
          responseMode: 'ANONYMOUS',
          questions: [
            { text: 'Rate workshop usefulness (1-5)', type: 'RATING', isRequired: true },
            { text: 'Share candid feedback', type: 'SHORT_TEXT', isRequired: true },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.responseMode).toBe('ANONYMOUS');
      expect(res.body.data.status).toBe('DRAFT');

      anonSurveyId = res.body.data.id;
      createdSurveyIds.push(anonSurveyId);
      anonRatingQId = res.body.data.Question[0].id;
      anonTextQId = res.body.data.Question[1].id;

      // Publish so respondent can submit
      const pubRes = await request(app)
        .post(`/api/surveys/${anonSurveyId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(pubRes.status).toBe(200);
    });

    it('TEST-36 (AC-23): Rejects invalid responseMode with 400 INVALID_PAYLOAD', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Invalid Mode Survey',
          responseMode: 'SECRET_MODE',
          questions: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('TEST-37 (AC-24): Redacts respondentId in anonymous submission & receipt while enforcing 409 duplicate guard', async () => {
      const payload = {
        answers: [
          { questionId: anonRatingQId, ratingValue: 5 },
          { questionId: anonTextQId, textValue: 'Very helpful session!' },
        ],
      };

      const firstRes = await request(app)
        .post(`/api/surveys/${anonSurveyId}/responses`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(payload);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.data.isAnonymous).toBe(true);
      expect(firstRes.body.data.respondentId).toBeNull();
      expect(firstRes.body.data.responseMode).toBe('ANONYMOUS');

      // Personal receipt lookup also marks isAnonymous and omits respondentId
      const receiptRes = await request(app)
        .get(`/api/surveys/${anonSurveyId}/responses/me`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(receiptRes.status).toBe(200);
      expect(receiptRes.body.data.isAnonymous).toBe(true);
      expect(receiptRes.body.data.respondentId).toBeNull();

      // Second submission by same student must still return 409 DUPLICATE_SUBMISSION (BR-06)
      const secondRes = await request(app)
        .post(`/api/surveys/${anonSurveyId}/responses`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(payload);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error.code).toBe('DUPLICATE_SUBMISSION');
    });

    it('TEST-38 (AC-25): Summary for ANONYMOUS survey includes responseMode and zero respondent PII', async () => {
      const res = await request(app)
        .get(`/api/surveys/${anonSurveyId}/summary`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.responseMode).toBe('ANONYMOUS');
      expect(res.body.data.totalResponses).toBe(1);

      const serialized = JSON.stringify(res.body.data);
      expect(serialized).not.toContain('student1@unipulse.edu');
      expect(serialized).not.toContain(student1Id);
      expect(serialized).not.toContain(student2Id);
      expect(serialized).not.toContain('respondentId');
    });
  });

  // ===========================================================================
  // F-15: Scheduled Expiry & Automatic Closure (AC-29, AC-30)
  // ===========================================================================
  describe('F-15 Scheduled Expiry (closesAt)', () => {
    it('TEST-44 (AC-29): Owner creates survey with valid ISO-8601 closesAt timestamp', async () => {
      const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Scheduled Deadline Survey',
          closesAt: futureIso,
          questions: [{ text: 'Q1', type: 'SHORT_TEXT', isRequired: true }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.closesAt).toBe(futureIso);
      createdSurveyIds.push(res.body.data.id);

      const detailRes = await request(app)
        .get(`/api/surveys/${res.body.data.id}`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.closesAt).toBe(futureIso);
    });

    it('TEST-45 (AC-29): Rejects malformed closesAt string with 400 INVALID_PAYLOAD', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Bad Deadline Survey',
          closesAt: 'not-a-valid-date',
          questions: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('TEST-46 (AC-30): Excludes expired PUBLISHED survey from respondent catalog and rejects submissions', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      const expired = await prisma.survey.create({
        data: {
          id: `srv_exp_test_${Date.now()}`,
          ownerId: owner1Id,
          title: 'Already Expired Survey',
          status: SurveyStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 120 * 1000),
          closesAt: pastDate,
          updatedAt: new Date(),
          Question: {
            create: [
              {
                id: `qst_exp_${Date.now()}`,
                text: 'Expired question',
                type: 'SHORT_TEXT',
                isRequired: true,
                displayOrder: 1,
              },
            ],
          },
        },
        include: { Question: true },
      });
      createdSurveyIds.push(expired.id);

      const catalogRes = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(catalogRes.status).toBe(200);
      expect(catalogRes.body.data.some((s: any) => s.id === expired.id)).toBe(false);

      const subRes = await request(app)
        .post(`/api/surveys/${expired.id}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [{ questionId: expired.Question[0].id, textValue: 'Late attempt' }],
        });
      expect(subRes.status).toBe(400);
      expect(subRes.body.error.code).toBe('SURVEY_NOT_ACCEPTING_RESPONSES');
    });
  });

  // ===========================================================================
  // F-17: Survey Duplication & Template Cloning (AC-34, AC-35)
  // ===========================================================================
  describe('F-17 Survey Duplication & Template Cloning', () => {
    let sourceSurveyId: string;
    let longTitleSurveyId: string;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Semester 1 Template Survey',
          description: 'Reusable template',
          responseMode: 'ANONYMOUS',
          questions: [
            { text: 'Overall quality', type: 'RATING', isRequired: true },
            {
              text: 'Preferred lab format',
              type: 'SINGLE_CHOICE',
              isRequired: true,
              options: ['Live Coding', 'Recorded Demo'],
            },
          ],
        });
      sourceSurveyId = createRes.body.data.id;
      createdSurveyIds.push(sourceSurveyId);

      // Publish source survey so we verify clone resets status back to DRAFT
      await request(app)
        .post(`/api/surveys/${sourceSurveyId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);

      // Create a max-length (150-char) title survey to verify Copy truncation boundary
      const longRes = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'X'.repeat(150),
          questions: [{ text: 'Q1', type: 'SHORT_TEXT', isRequired: true }],
        });
      longTitleSurveyId = longRes.body.data.id;
      createdSurveyIds.push(longTitleSurveyId);
    });

    it('TEST-51 (AC-34): Owner duplicates PUBLISHED survey into fresh DRAFT with copied questions and 150-char title truncation', async () => {
      const res = await request(app)
        .post(`/api/surveys/${sourceSurveyId}/duplicate`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({});

      expect(res.status).toBe(201);
      const clone = res.body.data;
      createdSurveyIds.push(clone.id);

      expect(clone.id).not.toBe(sourceSurveyId);
      expect(clone.title).toBe('Copy of Semester 1 Template Survey');
      expect(clone.description).toBe('Reusable template');
      expect(clone.responseMode).toBe('ANONYMOUS');
      expect(clone.status).toBe('DRAFT');
      expect(clone.publishedAt).toBeNull();
      expect(clone.closedAt).toBeNull();
      expect(clone.Question).toHaveLength(2);
      expect(clone.Question[0].id).not.toBeUndefined();
      expect(clone.Question[1].QuestionOption).toHaveLength(2);
      expect(clone.Question[1].QuestionOption.map((o: any) => o.label)).toEqual([
        'Live Coding',
        'Recorded Demo',
      ]);

      // Verify 150-char truncation boundary
      const longCloneRes = await request(app)
        .post(`/api/surveys/${longTitleSurveyId}/duplicate`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({});
      expect(longCloneRes.status).toBe(201);
      createdSurveyIds.push(longCloneRes.body.data.id);
      expect(longCloneRes.body.data.title.length).toBe(150);
      expect(longCloneRes.body.data.title.startsWith('Copy of ')).toBe(true);
    });

    it('TEST-52 (AC-35): Respondent attempting to duplicate survey receives 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post(`/api/surveys/${sourceSurveyId}/duplicate`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('TEST-53 (AC-35): Non-owning Owner (OWNER_2) attempting to duplicate OWNER_1 survey receives 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .post(`/api/surveys/${sourceSurveyId}/duplicate`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('TEST-54 (AC-35): Duplicating non-existent survey ID returns 404 SURVEY_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/surveys/srv_nonexistent_999/duplicate')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });
  });
});
