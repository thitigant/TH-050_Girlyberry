# Sprint 2 Feature Engineering Contracts (Deliverable 2 — Part B)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme 10:** Review, Feedback, and Survey System (**UniPulse**)
- **Team:** TH-050 Girlyberry (`@thitigant` `67070505214`, `@Ponatinylilbug` `67070505210`)
- **Document Version:** 1.0.0 (Pre-Implementation Sprint 2 Contract Baseline — Issue #34)

---

## 1. Overview of Sprint 2 Feature Contracts

This specification defines the authoritative pre-implementation engineering contracts for all five Sprint 2 features (`F-13` through `F-17`). For every feature, the contract specifies linked requirements (`FR`, `BR`, `NFR`), workflow & UI behavior, API endpoints (`/api/surveys/...`), database schema/migrations (or explicit statement when no schema migration is required), validation & error boundaries, role/ownership permissions, dependencies, and numbered Acceptance Criteria (`AC-23` to `AC-35`).

| Feature ID | Feature Title | Linked Requirements | Assigned Acceptance Criteria | Planned Automated Tests |
| :--- | :--- | :--- | :--- | :--- |
| **`F-13`** | Anonymous Response Mode | `FR-18`, `BR-06`, `BR-08`, `NFR-12` | `AC-23`, `AC-24`, `AC-25` | `TEST-35`, `TEST-36`, `TEST-37`, `TEST-38` |
| **`F-14`** | Advanced Question Types (`MULTIPLE_CHOICE`, `LIKERT_SCALE`) | `FR-06`, `FR-07`, `FR-13`, `BR-03`, `BR-12` | `AC-26`, `AC-27`, `AC-28` | `TEST-39`, `TEST-40`, `TEST-41`, `TEST-42`, `TEST-43` |
| **`F-15`** | Scheduled Expiry & Automatic Closure (`closesAt`) | `FR-20`, `BR-05`, `NFR-03` | `AC-29`, `AC-30` | `TEST-44`, `TEST-45`, `TEST-46` |
| **`F-16`** | Respondent Eligibility & Cohort Access Control | `FR-19`, `BR-08`, `NFR-02` | `AC-31`, `AC-32`, `AC-33` | `TEST-47`, `TEST-48`, `TEST-49`, `TEST-50` |
| **`F-17`** | Survey Duplication & Template Cloning | `FR-05`, `FR-07`, `BR-02`, `BR-04`, `BR-10` | `AC-34`, `AC-35` | `TEST-51`, `TEST-52`, `TEST-53`, `TEST-54` |

---

## 2. Feature Contract: `F-13` Anonymous Response Mode

### 2.1 Requirements & Dependencies
- **Linked Requirements:** `FR-18` (Anonymous response mode configuration), `BR-06` (Single-submission enforcement per respondent per survey), `BR-08` (Receipt privacy isolation), `NFR-12` (Zero respondent identity exposure in results).
- **Dependencies:** `F-01` (Auth), `F-03` (Create Survey), `F-08` (Submit Response), `F-09` (Duplicate Guard), `F-10` (Receipts), `F-12` (Aggregate Summary).

### 2.2 UI Behavior
- **Survey Owner (`CreateSurveyView.tsx` & `OwnerSurveysView.tsx`):**
  - Provides a **`Response Mode`** selector during draft creation (`IDENTIFIED` vs `ANONYMOUS`, default `IDENTIFIED`).
  - Survey cards display an **`ANONYMOUS`** or **`IDENTIFIED`** privacy badge alongside the lifecycle status badge.
- **Respondent (`BrowseSurveysView.tsx`, `SurveyTakingView.tsx`, `ReceiptsView.tsx`):**
  - Surveys configured with `responseMode === 'ANONYMOUS'` display a privacy callout banner informing students that their submission is recorded anonymously while participation is tracked purely to prevent duplicate votes.

### 2.3 API Specifications
- **`POST /api/surveys`** (and `/api/v1/surveys`):
  - **Request Body Addition:** `"responseMode": "IDENTIFIED" | "ANONYMOUS"` (optional, defaults to `"IDENTIFIED"`).
- **`POST /api/surveys/:id/responses`**:
  - Enforces single-submission uniqueness (`BR-06`, HTTP `409 DUPLICATE_SUBMISSION`) regardless of whether `responseMode` is `IDENTIFIED` or `ANONYMOUS`.
  - When `survey.responseMode === 'ANONYMOUS'`, the returned `201 Created` confirmation receipt payload redacts `respondentId` (`respondentId: null`, `isAnonymous: true`) so the response payload carries no direct user identifier.
- **`GET /api/surveys/:id/responses/me` & `GET /api/responses/:id`**:
  - Returns the calling respondent's own confirmation receipt (`BR-08`) with `"responseMode": "ANONYMOUS"` and `"isAnonymous": true` when the survey is anonymous.
- **`GET /api/surveys/:id/summary` (and `/api/surveys/:id/analytics`)**:
  - Includes `"responseMode": "IDENTIFIED" | "ANONYMOUS"` in the summary header and guarantees zero respondent IDs, emails, or names appear anywhere in the payload (`NFR-12`).

### 2.4 Data Fields, Constraints & Migrations
- **Prisma Schema (`server/prisma/schema.prisma`):**
  - Enum `ResponseMode { IDENTIFIED, ANONYMOUS }` and column `Survey.responseMode` (`@default(IDENTIFIED)`) are already present in the baseline schema.
  - Composite unique index `@@unique([surveyId, respondentId])` on `Response` remains the authoritative database-level single-vote tracker (`BR-06`), while service/DTO projection strips `respondentId` from anonymous response DTOs and owner outputs.

### 2.5 Validation, Error Codes & Permissions
- **Validation:** `responseMode` must be one of `["IDENTIFIED", "ANONYMOUS"]`; invalid values return `400 INVALID_PAYLOAD`.
- **Permissions:** Only `SURVEY_OWNER` can set `responseMode` during survey creation. Neither `SURVEY_OWNER` nor any other user can query individual respondent identities on an `ANONYMOUS` survey.

### 2.6 Numbered Acceptance Criteria
- **`AC-23`:** A `SURVEY_OWNER` can create a draft survey with `responseMode: "ANONYMOUS"` (or default `"IDENTIFIED"`), and `GET /api/surveys/:id` returns the persisted `responseMode`. Invalid `responseMode` strings are rejected with `HTTP 400 INVALID_PAYLOAD`.
- **`AC-24`:** When a `RESPONDENT` submits a valid response to a `PUBLISHED` survey with `responseMode: "ANONYMOUS"`, `POST /api/surveys/:id/responses` returns `HTTP 201 Created` with `isAnonymous: true` and `respondentId: null` in the returned receipt DTO, while still rejecting any second submission attempt from the same respondent with `HTTP 409 DUPLICATE_SUBMISSION` (`BR-06`).
- **`AC-25`:** Calling `GET /api/surveys/:id/summary` on an `ANONYMOUS` survey returns `responseMode: "ANONYMOUS"` and accurate aggregate metrics with zero respondent-identifying fields (`respondentId`, `email`, `name`) anywhere in the JSON payload (`NFR-12`).

---

## 3. Feature Contract: `F-14` Advanced Question Types (`MULTIPLE_CHOICE` & `LIKERT_SCALE`)

### 3.1 Requirements & Dependencies
- **Linked Requirements:** `FR-06` (Configurable question types), `FR-07` (Question ordering), `FR-13` (Response format & required field validation), `BR-03` (1–30 questions limit & option bounds), `BR-12` (1–5 scale bounds).
- **Dependencies:** `F-03`, `F-04`, `F-07`, `F-08`, `F-12`.

### 3.2 UI Behavior
- **Survey Owner (`CreateSurveyView.tsx`):**
  - Question type dropdown expands to support **`Multiple Choice (Checkboxes)`** (`MULTIPLE_CHOICE`) and **`Likert Scale (1-5 Agreement)`** (`LIKERT_SCALE`) in addition to `RATING`, `SINGLE_CHOICE`, and `SHORT_TEXT`.
  - Selecting `MULTIPLE_CHOICE` renders the 2–10 option editor (same as `SINGLE_CHOICE`).
  - Selecting `LIKERT_SCALE` previews the 5-point agreement labels (`1: Strongly Disagree` to `5: Strongly Agree`).
- **Respondent (`SurveyTakingView.tsx`):**
  - `MULTIPLE_CHOICE` renders multi-select checkboxes allowing the respondent to check 1 or more options.
  - `LIKERT_SCALE` renders a 5-point labeled agreement selector (`1 = Strongly Disagree`, `2 = Disagree`, `3 = Neutral`, `4 = Agree`, `5 = Strongly Agree`).
- **Owner Analytics (`SurveySummaryDashboard.tsx`):**
  - Displays per-option selection counts and percentages for `MULTIPLE_CHOICE` questions, and average agreement score (1–5) plus distribution for `LIKERT_SCALE` questions.

### 3.3 API Specifications
- **`POST /api/surveys`**:
  - `questions[].type` accepts `'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING' | 'LIKERT_SCALE' | 'SHORT_TEXT'`.
  - For `MULTIPLE_CHOICE`, requires 2 to 10 unique non-empty option strings in `questions[].options`.
- **`POST /api/surveys/:id/responses`**:
  - For `MULTIPLE_CHOICE`, `answers[]` accepts `"selectedOptionIds": string[]` (array of valid option IDs belonging to that question; also accepts single `selectedOptionId` for backward compatibility).
  - For `LIKERT_SCALE`, `answers[]` accepts integer `"ratingValue": 1..5` (or `"numericValue": 1..5`).
- **`GET /api/surveys/:id/summary`**:
  - Aggregates `MULTIPLE_CHOICE` answers across all selected options (`totalSelections`, per-option `count` and `percentage` relative to total responses).
  - Aggregates `LIKERT_SCALE` answers identically to `RATING` (`averageScore`, `totalRatings`, 1–5 `distribution`).

### 3.4 Data Fields, Constraints & Migrations
- **Prisma Schema (`server/prisma/schema.prisma`):**
  - Add `MULTIPLE_CHOICE` and `LIKERT_SCALE` to `enum QuestionType`.
  - On model `Answer`: to support multiple selected options for a single `MULTIPLE_CHOICE` question while preserving `@@unique([responseId, questionId])`, store multi-select option IDs in `textValue` as a JSON array of validated option IDs (or dedicated `selectedOptionIds` string/JSON representation) alongside `selectedOptionId` for the primary option, requiring no destructive table recreation.

### 3.5 Validation, Error Codes & Permissions
- `MULTIPLE_CHOICE` question creation with `< 2` or `> 10` options or duplicate option labels returns `400 INVALID_PAYLOAD`.
- Submitting a required `MULTIPLE_CHOICE` question with an empty `selectedOptionIds: []` returns `422 EMPTY_REQUIRED_ANSWER`.
- Submitting a `MULTIPLE_CHOICE` answer containing an option ID that does not belong to that question returns `422 INVALID_OPTION_SELECTED`.
- Submitting a `LIKERT_SCALE` answer outside integer range `[1, 5]` returns `422 RATING_OUT_OF_RANGE`.

### 3.6 Numbered Acceptance Criteria
- **`AC-26`:** A `SURVEY_OWNER` can create a draft survey containing `MULTIPLE_CHOICE` (with 2–10 unique options) and `LIKERT_SCALE` questions. Creating a `MULTIPLE_CHOICE` question with fewer than 2 options, more than 10 options, or duplicate labels is rejected with `HTTP 400 INVALID_PAYLOAD`.
- **`AC-27`:** A `RESPONDENT` can submit multiple selected option IDs (`selectedOptionIds: [opt1, opt2]`) for a `MULTIPLE_CHOICE` question and an integer score `[1, 5]` for a `LIKERT_SCALE` question (`HTTP 201 Created`). Invalid option IDs return `HTTP 422 INVALID_OPTION_SELECTED`, empty required selections return `HTTP 422 EMPTY_REQUIRED_ANSWER`, and Likert values outside `[1, 5]` return `HTTP 422 RATING_OUT_OF_RANGE`.
- **`AC-28`:** `GET /api/surveys/:id/summary` accurately computes option selection counts and percentages for `MULTIPLE_CHOICE` questions and average score + 1–5 distribution for `LIKERT_SCALE` questions.

---

## 4. Feature Contract: `F-15` Scheduled Expiry & Automatic Closure (`closesAt`)

### 4.1 Requirements & Dependencies
- **Linked Requirements:** `FR-20` (Scheduled closing date/time & automatic deadline enforcement), `BR-05` (Responses accepted only for active `PUBLISHED` surveys before deadline), `NFR-03` (Uniform error schema).
- **Dependencies:** `F-03`, `F-05`, `F-06`, `F-08`.

### 4.2 UI Behavior
- **Survey Owner (`CreateSurveyView.tsx` & `OwnerSurveysView.tsx`):**
  - Survey creation form includes an optional **`Scheduled Closing Date/Time (closesAt)`** datetime picker.
  - Survey cards display the scheduled deadline badge (`Closes: <formatted date>`) or **`Expired`** indicator if `closesAt <= now`.
- **Respondent (`BrowseSurveysView.tsx`):**
  - Active published surveys with a future `closesAt` display their closing deadline badge; surveys whose `closesAt` has elapsed are automatically excluded from the active respondent catalog.

### 4.3 API Specifications
- **`POST /api/surveys`**:
  - Accepts optional `"closesAt": "<ISO-8601 datetime string>"` (or `null`).
  - Validates that if `closesAt` is provided on creation, it is a valid ISO timestamp.
- **`GET /api/surveys` (Respondent Catalog)**:
  - Filters out any `PUBLISHED` survey where `closesAt !== null && closesAt <= now`.
- **`POST /api/surveys/:id/responses`**:
  - Rejects submissions when `survey.closesAt !== null && survey.closesAt <= now` with `HTTP 400 SURVEY_NOT_ACCEPTING_RESPONSES` (`"Survey response deadline has passed"`).

### 4.4 Data Fields, Constraints & Migrations
- **Prisma Schema:** Column `closesAt DateTime?` is already defined on model `Survey` in `server/prisma/schema.prisma`. No breaking migration required.

### 4.5 Validation, Error Codes & Permissions
- Malformed `closesAt` string (not a valid date) during survey creation returns `HTTP 400 INVALID_PAYLOAD`.
- Submitting a response at or after `closesAt` returns `HTTP 400 SURVEY_NOT_ACCEPTING_RESPONSES`.

### 4.6 Numbered Acceptance Criteria
- **`AC-29`:** A `SURVEY_OWNER` can create a survey with a valid ISO-8601 `closesAt` timestamp (`HTTP 201 Created`), and `GET /api/surveys/:id` returns the persisted `closesAt` timestamp. Providing a malformed `closesAt` string is rejected with `HTTP 400 INVALID_PAYLOAD`.
- **`AC-30`:** Once a survey's `closesAt` timestamp has passed (`closesAt <= now`), the survey is automatically excluded from the `RESPONDENT` catalog (`GET /api/surveys`) and any submission attempt (`POST /api/surveys/:id/responses`) is rejected with `HTTP 400 SURVEY_NOT_ACCEPTING_RESPONSES`.

---

## 5. Feature Contract: `F-16` Respondent Eligibility & Cohort Access Control

### 5.1 Requirements & Dependencies
- **Linked Requirements:** `FR-19` (Restricting survey participation by target cohort or access key), `BR-08` (Access isolation), `NFR-02` (100% server-side authorization enforcement).
- **Dependencies:** `F-02`, `F-03`, `F-07`, `F-08`.

### 5.2 UI Behavior
- **Survey Owner (`CreateSurveyView.tsx` & `OwnerSurveysView.tsx`):**
  - Survey creation form includes an optional **`Cohort Access Code`** input (e.g., `"CPE334-SEC1"`) and/or **`Allowed Email Domain`** (e.g., `"@unipulse.edu"`).
  - Survey cards display a **`Cohort Protected`** badge when a cohort access code or domain filter is configured.
- **Respondent (`SurveyTakingView.tsx`):**
  - When taking a survey that requires a Cohort Access Code, an **`Access Code`** input field is rendered at the top of the form; submitting without the matching code displays the server's `HTTP 403 COHORT_ACCESS_DENIED` error banner.

### 5.3 API Specifications
- **`POST /api/surveys`**:
  - Accepts optional `"accessCode": string | null` (trimmed, 3–32 chars if provided) and optional `"allowedEmailDomain": string | null` (e.g., `"@unipulse.edu"`).
- **`GET /api/surveys` & `GET /api/surveys/:id`**:
  - For `RESPONDENT` callers, never leaks the raw `accessCode` secret value! Instead returns boolean flag `"requiresAccessCode": boolean` and `"allowedEmailDomain": string | null`. (The owning `SURVEY_OWNER` can see `accessCode`).
- **`POST /api/surveys/:id/responses`**:
  - Accepts optional `"accessCode": string` in the submission payload.
  - If the survey has an `allowedEmailDomain` configured and `req.user.email` does not end with that domain (case-insensitive), rejects with `HTTP 403 COHORT_ACCESS_DENIED`.
  - If the survey has an `accessCode` configured and the submitted `accessCode` is missing or does not match, rejects with `HTTP 403 COHORT_ACCESS_DENIED`.

### 5.4 Data Fields, Constraints & Migrations
- **Prisma Schema (`server/prisma/schema.prisma`):**
  - Add optional columns `accessCode String?` and `allowedEmailDomain String?` to model `Survey` (applied via `npx prisma db push`).

### 5.5 Validation, Error Codes & Permissions
- `accessCode` shorter than 3 characters or longer than 32 characters (when non-empty) returns `HTTP 400 INVALID_PAYLOAD`.
- Mismatched/missing `accessCode` or non-matching respondent email domain on submission returns `HTTP 403 COHORT_ACCESS_DENIED`.
- Respondent detail endpoint (`GET /api/surveys/:id`) must strip `accessCode` and expose only `requiresAccessCode: true/false`.

### 5.6 Numbered Acceptance Criteria
- **`AC-31`:** A `SURVEY_OWNER` can configure an optional `accessCode` (3–32 chars) and/or `allowedEmailDomain` when creating a draft survey. When a `RESPONDENT` fetches `GET /api/surveys` or `GET /api/surveys/:id`, the response indicates `requiresAccessCode: true` without leaking the plaintext `accessCode`.
- **`AC-32`:** When a survey is protected by an `accessCode`, a `RESPONDENT` submitting `POST /api/surveys/:id/responses` with a missing or incorrect `accessCode` is rejected with `HTTP 403 COHORT_ACCESS_DENIED`, whereas submitting the matching `accessCode` succeeds (`HTTP 201 Created`).
- **`AC-33`:** When a survey specifies `allowedEmailDomain` (e.g., `"@kmutt.ac.th"`), a `RESPONDENT` whose authenticated email does not match that domain is rejected with `HTTP 403 COHORT_ACCESS_DENIED`.

---

## 6. Feature Contract: `F-17` Survey Duplication & Template Cloning

### 6.1 Requirements & Dependencies
- **Linked Requirements:** `FR-05` (Create draft survey), `FR-07` (Ordered question configuration), `BR-02` (Draft status initialization), `BR-04` (Immutability of published/closed surveys), `BR-10` (Owner-only management).
- **Dependencies:** `F-02`, `F-03`, `F-04`, `F-05`.

### 6.2 UI Behavior
- **Survey Owner (`OwnerSurveysView.tsx`):**
  - Every survey card (`DRAFT`, `PUBLISHED`, or `CLOSED`) in the Owner dashboard includes a **`Duplicate / Clone`** action button.
  - Clicking **`Duplicate / Clone`** calls `POST /api/surveys/:id/duplicate` and immediately adds the newly cloned `DRAFT` survey (titled `"Copy of <Original Title>"` with 0 responses and all original questions/options copied in order) to the Owner's survey list.

### 6.3 API Specifications
- **`POST /api/surveys/:id/duplicate`** (and `/api/v1/surveys/:id/duplicate`):
  - **Authentication & Role:** Requires `SURVEY_OWNER` (`requireAuth`, `requireRole('SURVEY_OWNER')`).
  - **Ownership Check:** Verifies `sourceSurvey.ownerId === req.user.id`; if owned by another owner, returns `HTTP 403 FORBIDDEN_OWNERSHIP`. If survey ID does not exist, returns `HTTP 404 SURVEY_NOT_FOUND`.
  - **Optional Request Body:** `{ "title"?: string }` (defaults to `"Copy of " + sourceSurvey.title`, truncated to 150 chars).
  - **Behavior:** Atomically creates a brand-new `Survey` record in `DRAFT` status (`publishedAt: null`, `closedAt: null`, 0 responses) copying `description`, `responseMode`, `allowedEmailDomain`, `accessCode`, and deep-copying all `Question` and `QuestionOption` rows with fresh UUIDs and preserved `displayOrder`.
  - **Response (`201 Created`):** `{ "data": <newSurveyWithQuestionsAndOptions> }`.

### 6.4 Data Fields, Constraints & Migrations
- **Database Layer:** Uses existing `Survey`, `Question`, and `QuestionOption` tables in a single Prisma nested write. No schema migration required.

### 6.5 Validation, Error Codes & Permissions
- Non-existent source survey ID → `HTTP 404 SURVEY_NOT_FOUND`.
- `RESPONDENT` calling `/duplicate` → `HTTP 403 FORBIDDEN_ROLE`.
- Non-owning `SURVEY_OWNER` calling `/duplicate` on another owner's survey → `HTTP 403 FORBIDDEN_OWNERSHIP`.

### 6.6 Numbered Acceptance Criteria
- **`AC-34`:** An authenticated `SURVEY_OWNER` can duplicate any of their own surveys (`DRAFT`, `PUBLISHED`, or `CLOSED`) via `POST /api/surveys/:id/duplicate`, receiving `HTTP 201 Created` with a new survey ID, status `DRAFT`, `publishedAt: null`, `closedAt: null`, zero responses, and a complete deep copy of all ordered questions and options.
- **`AC-35`:** Attempting to duplicate a survey as a `RESPONDENT` is rejected with `HTTP 403 FORBIDDEN_ROLE`, attempting to duplicate another owner's survey is rejected with `HTTP 403 FORBIDDEN_OWNERSHIP`, and duplicating a non-existent survey ID returns `HTTP 404 SURVEY_NOT_FOUND`.
