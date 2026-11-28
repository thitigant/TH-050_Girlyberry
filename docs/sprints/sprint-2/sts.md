# Sprint 2 Software Test Specification (STS) (Deliverable 2 — Part B)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme 10:** Review, Feedback, and Survey System (**UniPulse**)
- **Team:** TH-050 Girlyberry (`@thitigant` `67070505214`, `@Ponatinylilbug` `67070505210`)
- **Document Version:** 1.0.0 (Pre-Implementation Sprint 2 Test Specification — Issue #34)

---

## 1. Testing Strategy & Levels for Sprint 2

Sprint 2 expands the automated Vitest + Supertest verification suite (`server/tests/`) on top of the 81 Sprint 1 baseline tests. Every Sprint 2 Acceptance Criterion (`AC-23` to `AC-35`) is mapped to explicit automated tests covering:
1. **Normal Domain Workflows (Integration):** End-to-end API + PostgreSQL persistence for anonymous mode (`F-13`), multi-choice & Likert questions (`F-14`), scheduled expiry (`F-15`), cohort eligibility (`F-16`), and survey cloning (`F-17`).
2. **Boundary & Negative Validation Tests:** Invalid option counts, empty multi-choice selections, Likert out-of-range values (`0`, `6`), elapsed `closesAt` timestamps, and malformed inputs.
3. **Security, Privacy & Role/Ownership Tests:** Redaction of respondent identity on anonymous surveys, hiding plaintext `accessCode` from respondent GET payloads, blocking wrong cohort access codes/domains (`403 COHORT_ACCESS_DENIED`), and blocking cross-owner survey duplication (`403 FORBIDDEN_OWNERSHIP`).

---

## 2. Sprint 2 Test Specifications Catalog (`TEST-35` to `TEST-54`)

| Test ID | Linked Feature & AC | Test Level | Preconditions, Inputs & Action | Target Endpoint / Module | Expected Observable Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TEST-35`** | `F-13` / `AC-23` | Integration | Owner creates draft survey with `responseMode: "ANONYMOUS"` and 2 questions. | `POST /api/surveys` | `HTTP 201 Created`; `data.responseMode === "ANONYMOUS"`. |
| **`TEST-36`** | `F-13` / `AC-23` | Boundary | Owner creates survey with invalid `responseMode: "SECRET_MODE"`. | `POST /api/surveys` | `HTTP 400 Bad Request`; `error.code === "INVALID_PAYLOAD"`. |
| **`TEST-37`** | `F-13` / `AC-24` | Security / TDD | Respondent submits valid answers to `PUBLISHED` `ANONYMOUS` survey, then attempts a second submission. | `POST /api/surveys/:id/responses` | First submission returns `201 Created` with `data.isAnonymous === true` and `data.respondentId === null`; second submission is rejected with `HTTP 409 DUPLICATE_SUBMISSION`. |
| **`TEST-38`** | `F-13` / `AC-25` | Security / Privacy | Owner requests summary of `ANONYMOUS` survey after respondent submissions. | `GET /api/surveys/:id/summary` | `HTTP 200 OK`; `data.responseMode === "ANONYMOUS"`, `totalResponses >= 1`, and serialized JSON contains zero respondent emails, names, or user IDs. |
| **`TEST-39`** | `F-14` / `AC-26` | Integration | Owner creates draft survey with a `MULTIPLE_CHOICE` question (3 options) and a `LIKERT_SCALE` question. | `POST /api/surveys` | `HTTP 201 Created`; questions persisted with types `MULTIPLE_CHOICE` and `LIKERT_SCALE`. |
| **`TEST-40`** | `F-14` / `AC-26` | Boundary | Owner attempts to create `MULTIPLE_CHOICE` question with `< 2` options or duplicate option labels. | `POST /api/surveys` | `HTTP 400 Bad Request`; `error.code === "INVALID_PAYLOAD"`. |
| **`TEST-41`** | `F-14` / `AC-27` | Integration | Respondent submits `selectedOptionIds: [opt1, opt2]` for `MULTIPLE_CHOICE` and `ratingValue: 4` for `LIKERT_SCALE`. | `POST /api/surveys/:id/responses` | `HTTP 201 Created`; all selected options and Likert score persisted in PostgreSQL. |
| **`TEST-42`** | `F-14` / `AC-27` | Boundary / TDD | Respondent submits empty `selectedOptionIds: []` for required `MULTIPLE_CHOICE`, invalid option ID, or Likert score `0` / `6`. | `POST /api/surveys/:id/responses` | Returns `HTTP 422` with `EMPTY_REQUIRED_ANSWER`, `INVALID_OPTION_SELECTED`, or `RATING_OUT_OF_RANGE` respectively. |
| **`TEST-43`** | `F-14` / `AC-28` | Integration / Calc | Owner requests analytics summary for survey with `MULTIPLE_CHOICE` and `LIKERT_SCALE` responses. | `GET /api/surveys/:id/summary` | `HTTP 200 OK`; `MULTIPLE_CHOICE` summary reports accurate per-option counts/percentages; `LIKERT_SCALE` reports accurate mean and 1–5 distribution. |
| **`TEST-44`** | `F-15` / `AC-29` | Integration | Owner creates survey with future ISO timestamp `closesAt` (+24 hours). | `POST /api/surveys` | `HTTP 201 Created`; `data.closesAt` matches the configured ISO timestamp. |
| **`TEST-45`** | `F-15` / `AC-29` | Boundary | Owner creates survey with malformed `closesAt: "not-a-date"`. | `POST /api/surveys` | `HTTP 400 Bad Request`; `error.code === "INVALID_PAYLOAD"`. |
| **`TEST-46`** | `F-15` / `AC-30` | Rule / TDD | Survey is `PUBLISHED` with `closesAt` in the past (-1 minute); Respondent queries catalog and attempts submission. | `GET /api/surveys` & `POST /api/surveys/:id/responses` | Expired survey is excluded from respondent catalog (`GET /api/surveys`) and submission returns `HTTP 400 SURVEY_NOT_ACCEPTING_RESPONSES`. |
| **`TEST-47`** | `F-16` / `AC-31` | Security | Owner creates survey with `accessCode: "CPE334-S2"` and `allowedEmailDomain: "@unipulse.edu"`; Respondent fetches survey details. | `GET /api/surveys/:id` | `HTTP 200 OK`; `data.requiresAccessCode === true`, `data.allowedEmailDomain === "@unipulse.edu"`, and raw `accessCode` is undefined/omitted for Respondent. |
| **`TEST-48`** | `F-16` / `AC-32` | Security / TDD | Respondent submits response to `accessCode`-protected survey without `accessCode` or with wrong code `"WRONG"`. | `POST /api/surveys/:id/responses` | `HTTP 403 Forbidden`; `error.code === "COHORT_ACCESS_DENIED"`. |
| **`TEST-49`** | `F-16` / `AC-32` | Integration | Respondent submits response to `accessCode`-protected survey with matching `accessCode: "CPE334-S2"`. | `POST /api/surveys/:id/responses` | `HTTP 201 Created`; submission succeeds and returns receipt. |
| **`TEST-50`** | `F-16` / `AC-33` | Security | Respondent with email `student1@unipulse.edu` attempts submission to survey restricted to `allowedEmailDomain: "@kmutt.ac.th"`. | `POST /api/surveys/:id/responses` | `HTTP 403 Forbidden`; `error.code === "COHORT_ACCESS_DENIED"`. |
| **`TEST-51`** | `F-17` / `AC-34` | Integration / TDD | Owner duplicates an existing `PUBLISHED` survey containing 3 questions and options. | `POST /api/surveys/:id/duplicate` | `HTTP 201 Created`; new survey has distinct ID, status `DRAFT`, title `"Copy of ..."`, `publishedAt === null`, and 3 deep-copied questions with options. |
| **`TEST-52`** | `F-17` / `AC-35` | Security | Respondent attempts to call `POST /api/surveys/:id/duplicate`. | `POST /api/surveys/:id/duplicate` | `HTTP 403 Forbidden`; `error.code === "FORBIDDEN_ROLE"`. |
| **`TEST-53`** | `F-17` / `AC-35` | Security | `OWNER_2` attempts to duplicate `OWNER_1`'s survey. | `POST /api/surveys/:id/duplicate` | `HTTP 403 Forbidden`; `error.code === "FORBIDDEN_OWNERSHIP"`. |
| **`TEST-54`** | `F-17` / `AC-35` | Boundary | Owner attempts to duplicate non-existent survey ID `srv_nonexistent_999`. | `POST /api/surveys/:id/duplicate` | `HTTP 404 Not Found`; `error.code === "SURVEY_NOT_FOUND"`. |

---

## 3. Selected Sprint 2 TDD Red-to-Green Candidates

1. **TDD Candidate 1 (`F-13` Anonymous Receipt Redaction & Single-Vote Guard — `TEST-37`):**
   - *Red State:* Submitting to an `ANONYMOUS` survey returns `respondentId` in the receipt payload or lacks `isAnonymous: true`.
   - *Green State:* `responseService.submitResponse` projects `isAnonymous: true` and `respondentId: null` for `ANONYMOUS` surveys while keeping composite `(surveyId, respondentId)` duplicate rejection (`409`).
2. **TDD Candidate 2 (`F-16` Cohort Access Code & Domain Enforcement — `TEST-48` & `TEST-50`):**
   - *Red State:* `POST /api/surveys/:id/responses` accepts submissions without verifying `survey.accessCode` or `survey.allowedEmailDomain`.
   - *Green State:* Service validates both `allowedEmailDomain` and `accessCode` before persisting responses, returning `403 COHORT_ACCESS_DENIED` on mismatch and stripping `accessCode` from respondent GET DTOs.
3. **TDD Candidate 3 (`F-17` Atomic Deep-Copy Survey Duplication — `TEST-51` & `TEST-53`):**
   - *Red State:* `POST /api/surveys/:id/duplicate` returns `404` before route/service implementation.
   - *Green State:* `surveyService.duplicateSurvey` verifies ownership (`403 FORBIDDEN_OWNERSHIP`) and deep-clones survey metadata, questions, and options into a fresh `DRAFT` survey (`201 Created`).
