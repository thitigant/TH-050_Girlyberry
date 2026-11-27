# CPE 334 Lab 7 — Part A: Change Impact Analysis & Pre-Implementation Contract Revision

- **Change Request Issue:** [#35 — Add Minimum Response Privacy Quorum (k-Anonymity) & Lifecycle Gate to Sprint 1 Survey Analytics (F-12 / BR-10)](https://github.com/thitigant/TH-050_Girlyberry/issues/35)
- **Team:** Section 1, Team TH-050 Girlyberry (`Jinjuta Nunnarumit` `67070505210` `@Ponatinylilbug`, `Thitigant Surayotin` `67070505214` `@thitigant`)
- **Product:** UniPulse – Campus Feedback & Course Survey Platform (Theme 10)
- **Accepted Sprint 1 Baseline:** Tag `v1.0-sprint1` (Commit `9a0ede4` / Release PR #17 `3dc7521`)
- **Pre-Change Deployed Release:** Commit `0405ffd` (Cloud Run revision `s17b15028-00005-l28`, live URL `https://s17b15028-4d7hbszvwq-as.a.run.app`, `staging` at `8f3aab2`)
- **Approval Record:** Self-Approved by Team TH-050 Girlyberry (`Jinjuta Nunnarumit` & `Thitigant Surayotin`) on `2026-11-27` per Prof. Suthep Madarasmi's Lab 7 Spec Sheet Change announcement (no Instructor/TA approval required; bounded, non-trivial change to existing Sprint 1 behavior).

---

## 1. Old-to-New Sprint 1 Behavior Summary

| Dimension | Old Sprint 1 Behavior (`v1.0-sprint1` / `0405ffd`) | Approved New Behavior (Issue #35, `v1.1.0`) |
| :--- | :--- | :--- |
| **Survey Creation (`F-03`, `POST /api/surveys`)** | Accepts `title`, `description`, `category`, and `questions` only; no privacy threshold setting. | Accepts optional integer `minResponsesForSummary` (`1..20`, default `3`). Rejects `< 1`, `> 20`, or non-integers with `HTTP 400 INVALID_PAYLOAD`. |
| **Live Published Analytics (`F-12`, `GET /api/surveys/:id/summary` & `/analytics`)** | Returns full per-question averages, choice counts, and `SHORT_TEXT` answers immediately even when `totalResponses = 1`, enabling owner inference of individual student comments. | Evaluates k-anonymity privacy gate: if `status === 'PUBLISHED'` and `totalResponses < minResponsesForSummary`, returns `privacyLocked: true`, `privacyReason`, and empty `questions: []` while preserving `surveyId`, `title`, `status`, `totalResponses`, and `minResponsesForSummary`. |
| **Quorum Reached (`PUBLISHED`, `totalResponses >= minResponsesForSummary`)** | Always unlocked regardless of count. | Returns `privacyLocked: false`, `privacyReason: null`, and full aggregate `questions` breakdown (averages, distributions, anonymized `SHORT_TEXT` answers). |
| **Closed Survey Lifecycle Gate (`CLOSED`, `totalResponses < minResponsesForSummary`)** | Always unlocked. | Lifecycle override unlocks final results (`privacyLocked: false`, `privacyReason: null`) so instructors can review final course feedback even in small classes once collection is closed. |
| **Owner UI (`CreateSurveyView`, `SurveySummaryDashboard`)** | No quorum input; always renders question breakdowns. | Draft form includes configurable `minResponsesForSummary` (1–20, default 3). Analytics dashboard displays a Privacy Quorum notice (`totalResponses / minResponsesForSummary`) when `privacyLocked === true` and explains how to unlock (collect remaining responses or close survey). |

---

## 2. Compact Change Impact Traceability Table

| Req / Rule ID | Feature | Affected Contract Sections | New / Revised AC | Planned STS Test IDs | Affected Code Modules & Layers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FR-05`, `NFR-03` | `F-03` Create Draft Survey | `docs/srs.md` §4 (v1.1.0), `docs/system-sds.md` §2.1–2.2 (v1.2.0), `docs/sprints/sprint-1/features-sds.md` §4 (v1.1.0) | `AC-L7-01` | `TEST-L7-01`, `TEST-L7-02` | **DB/Schema:** `server/prisma/schema.prisma` (`Survey.minResponsesForSummary Int @default(3)`). **Validator:** `server/src/validators/surveyValidator.ts`. **Service:** `server/src/services/surveyService.ts`. **UI:** `client/src/components/CreateSurveyView.tsx`, `client/src/types/survey.ts`. |
| `FR-16`, `FR-17`, `BR-10`, `NFR-12` | `F-12` Aggregate Results Summary Dashboard | `docs/srs.md` §4–6 (v1.1.0), `docs/system-sds.md` §3 & §5 (v1.2.0), `docs/sprints/sprint-1/features-sds.md` §7 (v1.1.0) | `AC-L7-02`, `AC-L7-03`, `AC-L7-04` | `TEST-L7-03`, `TEST-L7-04`, `TEST-L7-05`, `TEST-L7-06` | **Backend Service:** `server/src/services/analyticsService.ts` (`getSurveySummary`). **Controller/Routes:** `server/src/controllers/analyticsController.ts`, `server/src/routes/surveyRoutes.ts` (no route change; both `/summary` and `/analytics` invoke `getSurveySummary`). **UI:** `client/src/components/SurveySummaryDashboard.tsx`, `client/src/App.tsx`, `client/src/types/survey.ts`. **Tests:** `server/tests/analytics.test.ts`. |

---

## 3. Cross-Cutting Impact Assessment

| Impact Dimension | Assessment & Action |
| :--- | :--- |
| **Callers & Dependencies** | Both `/api/surveys/:id/summary` and `/api/surveys/:id/analytics` delegate to `analyticsService.getSurveySummary()`, so enforcing the quorum gate in the service guarantees identical behavior across both aliases. |
| **UI & API Validation** | Zod schema in `server/src/validators/surveyValidator.ts` validates `minResponsesForSummary` as optional integer `[1, 20]` (default `3`); `CreateSurveyView.tsx` enforces `min={1} max={20}` on the numeric input and passes the field in `POST /api/surveys`. |
| **Roles & Ownership** | **Unchanged & strictly preserved:** `requireAuth` + `requireRole(Role.SURVEY_OWNER)` and `survey.ownerId !== requestingUserId` (`403 FORBIDDEN_OWNERSHIP`) execute **before** the privacy quorum check. Neither `RESPONDENT` nor another `SURVEY_OWNER` can bypass authorization or read `totalResponses` / `privacyLocked` for another owner's survey. |
| **Persistence, Historical Data & Migrations** | Additive schema change: `minResponsesForSummary Int @default(3)` on `Survey`. Existing Cloud SQL and local PostgreSQL surveys automatically receive default value `3` with zero data loss and backward-compatible migration via `prisma db push` / Cloud Run migration job `s17b15028-migrate`. Seeded surveys (`server/prisma/seed.ts`) remain valid without breaking existing records. |
| **Authentication / Response Submission / Duplicate Guard (`F-01`, `F-04`, `F-05`, `F-06`–`F-10`)** | **Not Applicable (no behavior change):** Registration, login, JWT revocation, question authoring, publish/close transitions, response submission, `409 DUPLICATE_SUBMISSION`, and personal receipts are untouched. |

---

## 4. Preserved Existing Behavior & Regression Protection Plan

The following Sprint 1 behaviors **must remain unchanged** and will be verified by running the full existing backend Vitest + Supertest suite (`npm test` in `server/`, 7 test files / 81 existing tests) plus frontend typecheck/lint/build:
1. **Authentication & Revocation (`F-01`, `server/tests/auth.test.ts`):** `TEST-01`–`TEST-07` (`401 INVALID_CREDENTIALS`, `401 TOKEN_REVOKED`).
2. **Role & Ownership Guards (`F-02`, `server/tests/authorization.test.ts`, `server/tests/browse.test.ts`, `server/tests/lifecycle.test.ts`, `server/tests/analytics.test.ts`):** `TEST-08`, `TEST-28`, `TEST-29` (`403 FORBIDDEN_ROLE`, `403 FORBIDDEN_OWNERSHIP`, `404` Zero Draft Leakage).
3. **Survey Authoring & Lifecycle (`F-03`–`F-05`, `server/tests/survey.test.ts`):** `TEST-09`–`TEST-18` (title/question limits, `422 EMPTY_SURVEY_CANNOT_PUBLISH`, immutability after publish, close transition).
4. **Submission, Duplicate Guard & Receipts (`F-06`–`F-10`, `server/tests/response.test.ts`):** `TEST-14`, `TEST-19`–`TEST-21`, `TEST-26`, `TEST-31`–`TEST-32` (`409 DUPLICATE_SUBMISSION`, `400 SURVEY_NOT_ACCEPTING_RESPONSES`, `403 OWNER_CANNOT_RESPOND`, `422 RATING_OUT_OF_RANGE`).
5. **Rating Calculation & Zero PII (`F-12`, `server/tests/analytics.test.ts`):** `TEST-34` (`computeRatingSummary` precision) and `AC-21` (zero respondent email/ID leakage). *Note:* Any existing Sprint 1 analytics test that queries a `PUBLISHED` survey with `< 3` responses will explicitly configure `minResponsesForSummary: 1` (or submit 3 responses / close the survey) with the revision documented in Part B per Lab 7 Section 3.2.
