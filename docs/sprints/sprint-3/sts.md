# Sprint 3 Software Test Specification (STS) (Deliverable 2 — Part C)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme 10:** Review, Feedback, and Survey System (**UniPulse**)
- **Team:** TH-050 Girlyberry (`@thitigant` `67070505214`, `@Ponatinylilbug` `67070505210`)
- **Document Version:** 1.0.0 (Pre-Implementation Sprint 3 Test Specification — Issue #34)

---

## 1. Sprint 3 Test Specifications Catalog (`TEST-55` to `TEST-64`)

| Test ID | Linked Feature & AC | Test Level | Preconditions, Inputs & Action | Target Endpoint / Module | Expected Observable Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TEST-55`** | `F-18` / `AC-36` | Integration / Calc | Survey has multiple rating and choice responses; Owner requests summary. | `GET /api/surveys/:id/summary` | `HTTP 200 OK`; returns complete 1–5 frequency distribution object (`"1"`..`"5"`) and rounded `averageScore` for visual bar rendering. |
| **`TEST-56`** | `F-18` / `AC-37` | Boundary | Survey has 0 responses; Owner requests summary. | `GET /api/surveys/:id/summary` | `HTTP 200 OK`; `totalResponses === 0`, `averageScore === 0`, and all distribution buckets equal `0` without NaN errors. |
| **`TEST-57`** | `F-19` / `AC-38` | Integration / TDD | Owner exports survey results in JSON format (`?format=json`). | `GET /api/surveys/:id/export?format=json` | `HTTP 200 OK`; `Content-Disposition` contains `survey-<id>-results.json`; payload contains full aggregated question summaries and zero respondent PII. |
| **`TEST-58`** | `F-19` / `AC-39` | Integration / TDD | Owner exports survey results in CSV format (`?format=csv`). | `GET /api/surveys/:id/export?format=csv` | `HTTP 200 OK`; `Content-Type` is `text/csv`; body starts with CSV header `questionId,questionOrder,questionType,prompt,metricOrOption,countOrScore,percentage` and contains aggregated rows with zero respondent PII. |
| **`TEST-59`** | `F-19` / `AC-40` | Boundary | Owner requests export with unsupported format `?format=xml`. | `GET /api/surveys/:id/export?format=xml` | `HTTP 400 Bad Request`; `error.code === "INVALID_EXPORT_FORMAT"`. |
| **`TEST-60`** | `F-19` / `AC-40` | Security | Respondent or non-owning `SURVEY_OWNER` (`OWNER_2`) requests `GET /api/surveys/:id/export?format=csv`. | `GET /api/surveys/:id/export` | Respondent receives `HTTP 403 FORBIDDEN_ROLE`; `OWNER_2` receives `HTTP 403 FORBIDDEN_OWNERSHIP`. |
| **`TEST-61`** | `F-20` / `AC-41` | Integration | Client or health probe calls `/api/health`. | `GET /api/health` | `HTTP 200 OK` within `< 500 ms`; returns `{ status: "ok", uptimeSeconds, timestamp }` and zero secrets. |
| **`TEST-62`** | `F-20` / `AC-42` | Integration | Readiness probe calls `/api/ready` while PostgreSQL is connected. | `GET /api/ready` | `HTTP 200 OK`; returns `{ status: "ready", database: "connected", dbLatencyMs }` with numeric `dbLatencyMs >= 0`. |
| **`TEST-63`** | `F-21` / `AC-43` | Boundary | Request sent to non-existent API endpoint `GET /api/unknown-endpoint-999`. | `GET /api/unknown-endpoint-999` | `HTTP 404 Not Found`; returns standard `{ error: { code: "NOT_FOUND", message: "Resource not found" } }` envelope. |
| **`TEST-64`** | `F-21` / `AC-43` | Boundary | Oversized text answer (`> 2000` chars) or whitespace-only required text submitted. | `POST /api/surveys/:id/responses` | Deterministic `HTTP 400 INVALID_PAYLOAD` / `HTTP 422 EMPTY_REQUIRED_ANSWER` with zero unhandled 500 errors. |
