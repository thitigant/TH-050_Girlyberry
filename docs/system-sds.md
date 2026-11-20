# System-Level Software Design Specification (SDS)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Theme 10:** Review, Feedback, and Survey System  
**Product Title:** UniPulse – Campus Feedback & Course Survey Platform  
**Document Version:** 1.1.0 (Deliverable 1 Baseline)  

---

## 1. System Architecture & Tech Stack

UniPulse is architected as a **Full-Stack TypeScript Modular Monolith** separated into two clean workspaces:
- `client/`: Single Page Application (SPA) built with React 19, TypeScript, and Vite.
- `server/`: REST API backend powered by Node.js, Express, TypeScript, and Prisma ORM connecting to PostgreSQL 16.

All business validation, RBAC, ownership verification, state machine constraints, and duplicate checks are enforced authoritatively on the backend and database layers.

```
+-----------------------------------------------------------------------------------------+
|                                   Presentation Layer                                    |
|                      (client/ • React 19 + TypeScript + Vite SPA)                       |
|   +-----------------------+   +---------------------------+   +---------------------+   |
|   | Sign-In / Auth Header |   | Owner Portal & Analytics  |   | Respondent Catalog  |   |
|   +-----------------------+   +---------------------------+   +---------------------+   |
+-------------------------------------------+---------------------------------------------+
                                            | REST JSON via Bearer JWT (/api/v1/*)
                                            v
+-----------------------------------------------------------------------------------------+
|                                    Application Layer                                    |
|                     (server/ • Node.js + Express + TypeScript API)                      |
|   +------------------+  +-------------------+  +-----------------+  +---------------+   |
|   |  Auth Middleware |  |  Zod Request      |  | Domain Services |  | Safe Error    |   |
|   |  (RBAC + Token)  |  |  Validation       |  | (Business Rules)|  | Handler & Log |   |
|   +------------------+  +-------------------+  +-----------------+  +---------------+   |
+-------------------------------------------+---------------------------------------------+
                                            | Prisma ORM (TCP :5432)
                                            v
+-----------------------------------------------------------------------------------------+
|                                    Persistence Layer                                    |
|                               (PostgreSQL 16 in Docker)                                 |
|   User | RevokedToken | Survey | Question | QuestionOption | Response | Answer          |
|   Constraints: UNIQUE(surveyId, respondentId), UNIQUE(jti), ON DELETE CASCADE           |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Relational Data Model & Schema Design

### 2.1 Entity Relationship Diagram (ERD)

```
       +------------------------------------+
       |                User                |
       +------------------------------------+
       | PK  id           : String (UUID)   |
       |     email        : String (Unique) |
       |     name         : String          |
       |     passwordHash : String (bcrypt) |
       |     role         : Role (Enum)     |
       |     isActive     : Boolean         |
       |     createdAt    : DateTime        |
       +-----------------+------------------+
                         |
           +-------------+-------------+
           | 1:N                       | 1:N
           v                           v
+-----------------------+   +------------------------------------+
|     RevokedToken      |   |               Survey               |
+-----------------------+   +------------------------------------+
| PK  jti       : String|   | PK  id           : String (UUID)   |
| FK  userId    : String|   | FK  ownerId      : String          |
|     expiresAt : Date  |   |     title        : String          |
|     revokedAt : Date  |   |     description  : String?         |
+-----------------------+   |     status       : SurveyStatus    |
                            |     responseMode : ResponseMode    |
                            |     publishedAt  : DateTime?       |
                            |     closedAt     : DateTime?       |
                            |     closesAt     : DateTime?       |
                            |     createdAt    : DateTime        |
                            |     updatedAt    : DateTime        |
                            +-----------------+------------------+
                                              |
                   +--------------------------+--------------------------+
                   | 1:N (Cascade Delete)                                | 1:N
                   v                                                     v
+------------------------------------+                 +------------------------------------+
|              Question              |                 |              Response              |
+------------------------------------+                 +------------------------------------+
| PK  id           : String (UUID)   |                 | PK  id           : String (UUID)   |
| FK  surveyId     : String          |                 | FK  surveyId     : String          |
|     displayOrder : Int             |                 | FK  respondentId : String          |
|     type         : QuestionType    |                 |     submittedAt  : DateTime        |
|     text         : String          |                 +-----------------+------------------+
|     isRequired   : Boolean         |                 | UNIQUE(surveyId, respondentId)     |
+-----------------+------------------+                 +-----------------+------------------+
                  |                                                      |
    +-------------+-------------+                                        |
    | 1:N (Cascade Delete)      | 1:N                                    | 1:N (Cascade Delete)
    v                           v                                        v
+-----------------------+   +------------------------------------+       |
|    QuestionOption     |   |               Answer               | <-----+
+-----------------------+   +------------------------------------+
| PK  id           : Str|   | PK  id               : String (UUID)   |
| FK  questionId   : Str|   | FK  responseId       : String          |
|     displayOrder : Int|   | FK  questionId       : String          |
|     label        : Str|   | FK  selectedOptionId : String?         |
+-----------------------+   |     ratingValue      : Int?            |
| UNIQUE(questionId,    |   |     textValue        : String?         |
|        displayOrder)  |   +------------------------------------+
| UNIQUE(questionId,    |   | UNIQUE(responseId, questionId)     |
|        label)         |   +------------------------------------+
+-----------------------+
```

### 2.2 Relational Model Dictionary
1. **User:** System identities with roles (`SURVEY_OWNER` or `RESPONDENT`). Passwords hashed with bcrypt cost 12.
2. **RevokedToken:** Blacklist of invalidated JWT IDs (`jti`) created upon logout (`POST /api/v1/auth/logout`).
3. **Survey:** Course evaluations owned by a `User`. Lifecycle states: `DRAFT`, `PUBLISHED`, `CLOSED`.
4. **Question:** Ordered survey questions belonging to a `Survey`. Types: `SINGLE_CHOICE`, `RATING`, `SHORT_TEXT`.
5. **QuestionOption:** Allowed choices for `SINGLE_CHOICE` questions (2–10 options per question).
6. **Response:** Identified survey submission header linking `Survey` and `User` (respondent). Enforces `@@unique([surveyId, respondentId])` to prevent duplicate submissions.
7. **Answer:** Relational answer row storing option reference, integer rating [1, 5], or trimmed text.

---

## 3. UI Structure, Navigation & Shared States

The client application (`client/`) provides responsive views with centralized state management and consistent shared UI states:
- **Authentication Header (`AuthHeader.tsx`):** Displays logged-in identity, active role badge, quick demo switchers, and Sign-Out action.
- **Survey Owner Portal (`OwnerSurveysView.tsx` & `CreateSurveyView.tsx`):** Lists authored surveys categorized by status (`DRAFT`, `PUBLISHED`, `CLOSED`), draft creation form with live validation limits, and action controls for `Publish` and `Close`.
- **Owner Aggregate Analytics Dashboard (`SurveySummaryDashboard.tsx`):** Displays total submission counts, rating averages (1–5 scale), response distributions, and option percentages. Excludes PII (`NFR-12`).
- **Respondent Catalog (`BrowseSurveysView.tsx`):** Shows only active `PUBLISHED` surveys with deadline indicators and personal completion tags (`Completed` vs `Start Survey`). Non-published drafts are strictly hidden (`NFR-11`).
- **Survey Taking View (`SurveyTakingView.tsx`):** Multi-type question form with validation for required fields, rating selections [1, 5], and submission handling.
- **Personal Receipts View (`ReceiptsView.tsx`):** Displays personal confirmation cards with receipt ID, submission timestamp, and submitted answers.

### Shared UI States
1. **Loading State:** Skeletons and disabled button states during network round-trips (`isSubmitting`, `isLoading`).
2. **Empty State:** User-friendly callouts when no surveys or receipts exist (e.g., "No published surveys available").
3. **Error State:** Dismissible alert banners displaying server-returned error codes and messages (e.g., `Invalid email or password`, `Duplicate submission rejected`).
4. **Confirmation Receipt State:** Success modal/card showing receipt ID, survey title, and timestamp upon successful submission.

---

## 4. API Architecture & Conventions

### 4.1 Endpoint Routing & Versioning
All backend endpoints are prefixed with `/api/v1` (with backward-compatible `/api` aliases supported in Sprint 1).

### 4.2 Uniform Response Envelopes
All responses adhere strictly to uniform JSON wrappers:
- **Success (HTTP 2xx):**
  ```json
  {
    "data": { ... }
  }
  ```
- **Error (HTTP 4xx / 5xx):**
  ```json
  {
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human-readable description",
      "details": null
    }
  }
  ```

### 4.3 Comprehensive Error Code Taxonomy
The following authoritative error codes are enforced in `server/src/utils/errors.ts` and domain services:

| HTTP Status | Error Code | Description & Trigger Condition |
| :--- | :--- | :--- |
| `400` | `INVALID_PAYLOAD` | Request body failed Zod validation or malformed JSON |
| `400` | `INVALID_STATE_TRANSITION` | Attempted invalid lifecycle transition (e.g., closing a `DRAFT` or publishing `CLOSED`) |
| `400` | `SURVEY_NOT_ACCEPTING_RESPONSES` | Survey status is not `PUBLISHED` or `closesAt` deadline has elapsed |
| `401` | `UNAUTHORIZED` | Missing, expired, malformed, or invalid Bearer JWT token |
| `401` | `TOKEN_REVOKED` | JWT token `jti` is found in the `RevokedToken` database table |
| `403` | `FORBIDDEN_ROLE` | User role does not have permission for the requested endpoint |
| `403` | `FORBIDDEN_OWNERSHIP` | Survey Owner attempted to inspect, publish, or close another owner's survey |
| `403` | `OWNER_CANNOT_RESPOND` | Survey Owner attempted to submit a response to their own survey (`BR-07`) |
| `404` | `SURVEY_NOT_FOUND` | Survey ID does not exist, or survey is in `DRAFT` queried by non-owner (`NFR-11`) |
| `404` | `RESPONSE_NOT_FOUND` | Response receipt ID does not exist or belongs to another respondent (`BR-08`) |
| `404` | `NOT_FOUND` | Requested API route does not exist |
| `409` | `DUPLICATE_SUBMISSION` | Respondent already submitted to this survey (`BR-06`, composite unique violation) |
| `422` | `EMPTY_SURVEY_CANNOT_PUBLISH` | Attempted to publish a draft survey containing 0 questions (`BR-02`) |
| `422` | `RATING_OUT_OF_RANGE` | Rating answer submitted outside inclusive integer range `[1, 5]` (`BR-12`) |
| `422` | `EMPTY_REQUIRED_ANSWER` | Required question left unanswered or submitted with whitespace-only (`BR-13`) |
| `422` | `INVALID_OPTION_SELECTED` | Single choice answer references an option ID not belonging to the question |
| `422` | `INVALID_QUESTION` | Answer references a question ID not belonging to the survey |
| `422` | `DUPLICATE_QUESTION_ANSWER` | Multiple answer items provided for the same question ID |
| `500` | `INTERNAL_SERVER_ERROR` | Uncaught server exception; sanitized to prevent stack trace leakage |

---

## 5. Role & Permission Matrix

| Endpoint Path | Method | GUEST | RESPONDENT | SURVEY_OWNER | Server Ownership & Authorization Rule |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/v1/auth/login` | POST | Allow | Allow | Allow | Verifies credentials with bcrypt, issues HS256 JWT |
| `/api/v1/auth/me` | GET | Reject (401) | Allow | Allow | Returns authenticated user profile and role |
| `/api/v1/auth/logout` | POST | Reject (401) | Allow | Allow | Persists token `jti` to `RevokedToken` table |
| `/api/v1/surveys` (Owner) | POST | Reject (401) | Reject (403) | Allow | Creates `DRAFT` survey header and nested questions |
| `/api/v1/surveys` (Catalog) | GET | Reject (401) | Allow | Allow | Respondents see only `PUBLISHED`; Owners see own drafts |
| `/api/v1/surveys/:id` | GET | Reject (401) | Allow* | Allow | *Draft returns 404 for non-owners (`NFR-11` Zero Draft Leakage) |
| `/api/v1/surveys/:id/publish` | POST | Reject (401) | Reject (403) | Allow* | *Requires ownership + status=`DRAFT` + $\ge 1$ question |
| `/api/v1/surveys/:id/close` | POST | Reject (401) | Reject (403) | Allow* | *Requires ownership + status=`PUBLISHED` |
| `/api/v1/surveys/:id/responses` | POST | Reject (401) | Allow | Allow* | *Owner cannot respond to own survey (`BR-07`); single submission (`BR-06`) |
| `/api/v1/surveys/:id/responses/me` | GET | Reject (401) | Allow | Reject (403) | Scoped strictly to calling respondent ID |
| `/api/v1/responses/:id` | GET | Reject (401) | Allow* | Reject (403) | *Scoped strictly to receipt owner; 404 on cross-access (`BR-08`) |
| `/api/v1/surveys/:id/summary` | GET | Reject (401) | Reject (403) | Allow* | *Owner only; returns aggregate statistics without PII (`NFR-12`) |

---

## 6. Credential & Session Management Design

1. **Password Security:** All passwords are hashed using `bcryptjs` with cost factor 12 (`NFR-05`). Plaintext passwords are never stored in PostgreSQL or returned in API payloads.
2. **JWT Session Lifecycle:**
   - Tokens are cryptographically signed using HMAC-SHA256 with `JWT_SECRET`.
   - **Expiration Window:** Fixed at **60 minutes** (`JWT_EXPIRES_IN=60m` in `server/.env` and `server/src/utils/jwt.ts`).
   - Token payload includes `{ id, email, role, jti }`.
3. **Revocation Mechanism:**
   - Calling `POST /api/v1/auth/logout` inserts the token's `jti` and expiration timestamp into the `RevokedToken` table.
   - `authMiddleware.requireAuth` executes `prisma.revokedToken.findUnique({ where: { jti } })` on every authenticated request. If found, the request is immediately rejected with HTTP 401 (`TOKEN_REVOKED`).

---

## 7. Configuration, DB Setup & Cloud Deployment Architecture

### 7.1 Runtime Environment Variables & Secret Management

| Variable Name | Required | Default / Example Value | Purpose & Sensitivity |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `4000` | Backend Express HTTP server listening port |
| `NODE_ENV` | Required | `development` / `production` | Node.js execution mode |
| `DATABASE_URL` | Required | `postgresql://survey:changeme@127.0.0.1:5432/survey?schema=public` | PostgreSQL connection string (Secret) |
| `JWT_SECRET` | Required | `super-secret-jwt-key-...` | Secret cryptographic key for signing tokens (High Secret) |
| `JWT_EXPIRES_IN` | Optional | `60m` | Token validity duration |

Secrets are managed via `.env` files locally and injected via Secret Manager in production. `.env` is ignored by Git; `.env.example` provides deterministic templates.

### 7.2 Database Setup, Migration & Idempotent Seeding
- **Generate Prisma Client:** `npm run prisma:generate` (executes `prisma generate`).
- **Synchronize Schema:** `npm run prisma:db:push` (applies `schema.prisma` to PostgreSQL without downtime).
- **Run Migrations:** `npm run prisma:migrate` (executes `prisma migrate dev`).
- **Deterministic Seeding:** `npm run prisma:seed` (executes `server/prisma/seed.ts` using `prisma.user.upsert` with bcrypt cost 12 to populate deterministic accounts `owner1@unipulse.edu`, `owner2@unipulse.edu`, `student1@unipulse.edu`, `student2@unipulse.edu`).

### 7.3 Google Cloud Deployment Plan (Sprint 2 / Lab 5)
- **Containerization:** Multi-stage Docker packaging separating client static build and server Node.js runtime.
- **Compute:** Stateless container instances deployed to Google Cloud Run with automatic horizontal scaling.
- **Database:** Managed Google Cloud SQL for PostgreSQL 16 accessed via Cloud SQL Auth Proxy.
