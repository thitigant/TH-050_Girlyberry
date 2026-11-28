# Sprint 3 Feature Engineering Contracts (Deliverable 2 — Part C)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme 10:** Review, Feedback, and Survey System (**UniPulse**)
- **Team:** TH-050 Girlyberry (`@thitigant` `67070505214`, `@Ponatinylilbug` `67070505210`)
- **Document Version:** 1.0.0 (Pre-Implementation Sprint 3 Contract Baseline — Issue #34)

---

## 1. Overview of Sprint 3 Feature Contracts

This specification defines the complete pre-implementation engineering contracts for all remaining baseline features allocated to Sprint 3 (`F-18` through `F-21`). Per the Deliverable 2 checkpoint requirements (Section 2 & Section 3.3), all Sprint 3 features are specified here with full UI/API/data/validation/permission contracts and numbered Acceptance Criteria (`AC-36` to `AC-43`), and at least two meaningful Sprint 3 capabilities (`F-19` Survey Results Export in CSV/JSON and `F-20` Deep Database Health & Observability Probe, plus `F-18` visual distribution breakdown enhancements) are targeted for working, tested delivery in the Deliverable 2 release candidate.

| Feature ID | Feature Title | Linked Requirements | Assigned Acceptance Criteria | Planned Automated Tests | Target Status for Deliverable 2 Candidate (29 Nov) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`F-18`** | Visual Analytics & Distribution Charts | `FR-16`, `FR-17`, `BR-10`, `NFR-06` | `AC-36`, `AC-37` | `TEST-55`, `TEST-56` | **Implemented & Tested** (Visual rating distribution bars & choice breakdown cards; comparative cross-filtering scheduled for Final Delivery by 13 Dec) |
| **`F-19`** | Survey Results Export (`CSV` & `JSON`) | `FR-21`, `BR-10`, `NFR-02`, `NFR-12` | `AC-38`, `AC-39`, `AC-40` | `TEST-57`, `TEST-58`, `TEST-59`, `TEST-60` | **Implemented & Tested in Deliverable 2 Candidate** |
| **`F-20`** | Health Check & System Observability Probe | `NFR-01`, `NFR-04`, `NFR-08`, `NFR-09` | `AC-41`, `AC-42` | `TEST-61`, `TEST-62` | **Implemented & Tested in Deliverable 2 Candidate** |
| **`F-21`** | Error Resilience, Input Boundary Hardening & UX Polish | `NFR-01`, `NFR-03`, `NFR-06`, `NFR-07` | `AC-43` | `TEST-63`, `TEST-64` | **In Progress / Planned Completion by 13 Dec** |

---

## 2. Feature Contract: `F-18` Visual Analytics & Distribution Charts

### 2.1 Requirements & Dependencies
- **Linked Requirements:** `FR-16` (Aggregate summary view), `FR-17` (Rating distributions & option percentages), `BR-10` (Owner-only access), `NFR-06` (Responsive UI states).
- **Dependencies:** `F-12` (Aggregate Results Summary), `F-14` (Advanced Question Types).

### 2.2 UI Behavior
- **Owner Analytics Dashboard (`SurveySummaryDashboard.tsx`):**
  - Renders horizontal percentage distribution bars for `RATING` and `LIKERT_SCALE` (1★ to 5★ frequency bars with exact count and percentage labels).
  - Renders color-coded proportional progress bars for `SINGLE_CHOICE` and `MULTIPLE_CHOICE` options.
  - Displays a summary KPI header showing Total Responses, Survey Status badge, Response Mode badge (`IDENTIFIED` / `ANONYMOUS`), and overall mean rating score across all rating/Likert questions.

### 2.3 API Specifications & Data Layer
- Consumes `GET /api/surveys/:id/summary` (and `/api/surveys/:id/analytics`).
- **Data Layer:** No additional database migration required; utilizes aggregated `distribution` and `options` percentage structures computed by `analyticsService.ts`.

### 2.4 Numbered Acceptance Criteria
- **`AC-36`:** `GET /api/surveys/:id/summary` returns normalized 1–5 frequency distribution counts (`{"1": n1, "2": n2, "3": n3, "4": n4, "5": n5}`) and `averageScore` (rounded to 2 decimal places) for every `RATING` and `LIKERT_SCALE` question, and `SurveySummaryDashboard.tsx` renders visual distribution bars for each score level.
- **`AC-37`:** When a survey has zero responses (`totalResponses === 0`), `GET /api/surveys/:id/summary` and the Visual Analytics UI render zeroed distribution bars (`averageScore: 0`, `0%`) cleanly without NaN or division-by-zero errors.

---

## 3. Feature Contract: `F-19` Survey Results Export (`CSV` & `JSON`)

### 3.1 Requirements & Dependencies
- **Linked Requirements:** `FR-21` (Export survey results in structured CSV/JSON formats), `BR-10` (Strictly restricted to the survey's `SURVEY_OWNER`), `NFR-02` (RBAC & ownership guard), `NFR-12` (Zero respondent PII in exported datasets).
- **Dependencies:** `F-02`, `F-12`, `F-13`, `F-14`.

### 3.2 UI Behavior
- **Owner Analytics Dashboard (`SurveySummaryDashboard.tsx` & `OwnerSurveysView.tsx`):**
  - Displays **`Export CSV`** and **`Export JSON`** action buttons on the Owner's Analytics Dashboard.
  - Clicking **`Export CSV`** or **`Export JSON`** requests `GET /api/surveys/:id/export?format=csv` (or `format=json`) with the Owner's Bearer token and triggers a browser file download (`survey-<id>-results.csv` or `survey-<id>-results.json`).

### 3.3 API Specifications
- **`GET /api/surveys/:id/export?format=csv|json`** (and `/api/v1/surveys/:id/export`):
  - **Authentication & Authorization:** Requires `requireAuth` and `requireRole('SURVEY_OWNER')`.
  - **Ownership Verification:** Verifies `survey.ownerId === req.user.id`. If owned by another `SURVEY_OWNER`, rejects with `HTTP 403 FORBIDDEN_OWNERSHIP`. If survey does not exist, returns `HTTP 404 SURVEY_NOT_FOUND`.
  - **Query Parameter `format`:**
    - Defaults to `'json'` if omitted; accepts `'json'` or `'csv'` (case-insensitive). Any other `format` value (e.g., `'xml'`, `'pdf'`) is rejected with `HTTP 400 INVALID_EXPORT_FORMAT`.
  - **Response (`format=json`):**
    - Status `200 OK`, Header `Content-Type: application/json`, `Content-Disposition: attachment; filename="survey-<id>-results.json"`.
    - Payload `{ "data": { "exportedAt": "<ISO>", "format": "json", "surveyId": "...", "title": "...", "status": "...", "responseMode": "...", "totalResponses": N, "questions": [...] } }` containing zero respondent PII (`NFR-12`).
  - **Response (`format=csv`):**
    - Status `200 OK`, Header `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="survey-<id>-results.csv"`.
    - Body: RFC-4180 compliant CSV with header row `questionId,questionOrder,questionType,prompt,metricOrOption,countOrScore,percentage` followed by one row per question metric/option, properly escaping commas and double quotes. Contains zero respondent PII (`NFR-12`).

### 3.4 Data Fields, Constraints & Migrations
- **Database Layer:** Queries existing `Survey`, `Question`, `QuestionOption`, `Response`, and `Answer` tables via `analyticsService`. No schema migration required.

### 3.5 Validation, Error Codes & Permissions
- Unauthenticated request → `HTTP 401 UNAUTHORIZED`.
- `RESPONDENT` role → `HTTP 403 FORBIDDEN_ROLE`.
- Non-owning `SURVEY_OWNER` → `HTTP 403 FORBIDDEN_OWNERSHIP`.
- Non-existent survey ID → `HTTP 404 SURVEY_NOT_FOUND`.
- Unsupported `format` query parameter → `HTTP 400 INVALID_EXPORT_FORMAT`.

### 3.6 Numbered Acceptance Criteria
- **`AC-38`:** An authenticated `SURVEY_OWNER` requesting `GET /api/surveys/:id/export?format=json` for their own survey receives `HTTP 200 OK` with `Content-Disposition: attachment; filename="survey-<id>-results.json"` and a structured JSON dataset containing aggregate metrics for all questions and zero respondent-identifying fields (`NFR-12`).
- **`AC-39`:** An authenticated `SURVEY_OWNER` requesting `GET /api/surveys/:id/export?format=csv` for their own survey receives `HTTP 200 OK` with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="survey-<id>-results.csv"`, and a valid CSV header and rows representing each question's aggregated statistics with zero respondent PII.
- **`AC-40`:** Requesting `GET /api/surveys/:id/export` with an unsupported format (e.g., `?format=xml`) returns `HTTP 400 INVALID_EXPORT_FORMAT`; requesting as a `RESPONDENT` returns `HTTP 403 FORBIDDEN_ROLE`; requesting as a non-owning `SURVEY_OWNER` returns `HTTP 403 FORBIDDEN_OWNERSHIP`.

---

## 4. Feature Contract: `F-20` Health Check & System Observability Probe

### 4.1 Requirements & Dependencies
- **Linked Requirements:** `NFR-01` (Sub-500ms API response latency), `NFR-04` (PostgreSQL connectivity & persistence), `NFR-08` (Container readiness), `NFR-09` (Cloud Run observability).
- **Dependencies:** Prisma Client (`server/src/db/prisma.ts`) & Express application (`server/src/app.ts`).

### 4.2 API Specifications
- **`GET /api/health`** (and `/api/v1/health`):
  - Returns `HTTP 200 OK` with `{ "status": "ok", "service": "unipulse-server", "uptimeSeconds": <number>, "timestamp": "<ISO>" }`.
- **`GET /api/ready`** (and `/api/v1/ready`):
  - Executes a live lightweight PostgreSQL connectivity check (`SELECT 1` via `prisma.$queryRaw`) and measures database round-trip latency (`dbLatencyMs`).
  - Returns `HTTP 200 OK` with `{ "status": "ready", "database": "connected", "dbLatencyMs": <number>, "timestamp": "<ISO>" }` when PostgreSQL is reachable.
  - Returns `HTTP 503 Service Unavailable` with `{ "status": "not_ready", "database": "disconnected" }` if the database query fails.

### 4.3 Data Layer & Permissions
- **Data Layer:** Read-only `SELECT 1` health probe; no schema migration required.
- **Permissions:** Publicly accessible (`GUEST`, `RESPONDENT`, `SURVEY_OWNER`) for Cloud Run / Docker health checks; exposes zero secrets or connection strings.

### 4.4 Numbered Acceptance Criteria
- **`AC-41`:** `GET /api/health` responds within `< 500 ms` with `HTTP 200 OK`, `status: "ok"`, `uptimeSeconds`, and `timestamp` without exposing any environment secrets.
- **`AC-42`:** `GET /api/ready` verifies active PostgreSQL connectivity and responds with `HTTP 200 OK`, `status: "ready"`, `database: "connected"`, and numeric `dbLatencyMs`.

---

## 5. Feature Contract: `F-21` Error Resilience, Input Boundary Hardening & UX Polish

### 5.1 Requirements & Dependencies
- **Linked Requirements:** `NFR-01`, `NFR-03` (Uniform error schema `{ error: { code, message } }`), `NFR-06` (Consistent UI loading, empty, error, and confirmation states), `NFR-07` (Strict TypeScript type safety).
- **Dependencies:** All endpoints and UI views (`F-01`–`F-20`).

### 5.2 API & UI Behavior
- All unmatched `/api/*` routes consistently return `HTTP 404` with `{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }`.
- All input strings (survey titles, question prompts, option labels, text answers) are trimmed before validation, rejecting whitespace-only strings and oversized payloads (`> 150` char titles, `> 30` questions, `> 2000` char text answers) with deterministic `400` / `422` error codes.
- Frontend displays clear feedback banners for loading, empty catalogs, validation rejections, and export confirmation.

### 5.3 Numbered Acceptance Criteria
- **`AC-43`:** Unmatched API routes return `HTTP 404 NOT_FOUND` in the standard error envelope, oversized or whitespace-only payloads are deterministically rejected with `400`/`422` without unhandled `500` exceptions, and full build/typecheck (`npm run build:server` & `npm run build:client`) completes with zero errors.
