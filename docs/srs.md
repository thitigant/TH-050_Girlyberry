# Software Requirements Specification (SRS) & Product Scope
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Theme 10:** Review, Feedback, and Survey System  
**Product Title:** UniPulse – Campus Feedback & Course Survey Platform  
**Document Version:** 1.1.0 (Revised for Lab 7 Change Request #35 — k-Anonymity Privacy Quorum & Lifecycle Gate)  

---

## 1. Stakeholder Problem & Context

### 1.1 Problem Statement
In university environments and academic organizations, gathering structured feedback regarding courses, laboratory workshops, instructor guidance, and extracurricular activities is essential for quality assurance. However, existing manual or generic survey forms often lack:
1. Strict server-enforced role boundaries separating survey administrators/instructors from student respondents.
2. Robust database-level duplicate prevention ensuring each student submits exactly one evaluated response per active survey.
3. Guaranteed survey state lifecycles (`DRAFT`, `PUBLISHED`, `CLOSED`) that prevent data tampering while a survey is live.
4. Fast, dependable aggregation of feedback metrics for instructors without compromising respondent record privacy.

### 1.2 System Purpose & Chosen Context
**UniPulse** is a robust, full-stack web application designed for academic departments. It enables **Survey Owners** (instructors, teaching assistants, and event coordinators) to author surveys, configure validated questions, publish surveys with strict lifecycle control, and inspect real-time aggregate summaries. Concurrently, **Respondents** (enrolled students) can discover published surveys, submit validated feedback without duplicate voting, and inspect their own personal submission receipts.

---

## 2. Actors & Responsibilities

| Actor | Role Key | Description & Responsibilities |
| :--- | :--- | :--- |
| **Survey Owner** | `SURVEY_OWNER` | Faculty member, instructor, or event administrator who authors survey drafts, edits questions, publishes surveys, closes completed surveys, and accesses analytical aggregate reports. |
| **Respondent** | `RESPONDENT` | Enrolled student or participant who authenticates, reviews published surveys, submits verified answers once per survey, and retrieves personal submission receipts. |
| **Unauthenticated Visitor** | `GUEST` | Any external user requesting access to protected application routes or endpoints without valid authentication credentials; strictly restricted to login/registration endpoints. |

---

## 3. Product Scope & Exclusions

### 3.1 In-Scope (Three-Sprint Roadmap)
- Secure authentication system with bcrypt password hashing, JWT session lifecycle, and database-backed token revocation on logout.
- Strict server-side role and ownership authorization checks (enforced at middleware and query levels).
- Comprehensive survey lifecycle management: `DRAFT` $\rightarrow$ `PUBLISHED` $\rightarrow$ `CLOSED`.
- Authoring validated questions: Text responses, Single-choice (Radio), Multiple-choice (Checkbox), and Rating scale (1 to 5).
- Atomic response submissions with guaranteed single-submission rule enforced by database constraints.
- Real-time aggregate metric calculations (average rating, option selection percentages, total submission counters).
- End-to-end containerization via Docker and repeatable deployment pipeline targeting GCP Cloud Run and Cloud SQL.

### 3.2 Explicit Exclusions (Out-of-Scope)
- Integration with external third-party email delivery services (e.g., SendGrid/SES) or SMS OTP providers. Synthetic/local verification is used.
- Third-party payment gateways, monetary rewards, or commercial e-commerce features.
- Single Sign-On (SSO) federation with SAML/Active Directory or OAuth2 providers; local secure credential management is used.
- Automated AI sentiment analysis or natural language generation of survey summaries.

---

## 4. Functional Requirements (FR)

| Requirement ID | Title | Description | Target Sprint |
| :--- | :--- | :--- | :--- |
| **FR-01** | User Registration | System shall allow new users to register by providing name, valid institutional email, password, and designated role. | Sprint 1 |
| **FR-02** | User Authentication | System shall authenticate users via email and password, returning a signed JWT access token upon success. | Sprint 1 |
| **FR-03** | Identity Retrieval | System shall provide a `/api/auth/me` endpoint to retrieve authenticated user profile and assigned role. | Sprint 1 |
| **FR-04** | User Logout | System shall terminate user session and record token hash in `RevokedToken` table to invalidate subsequent requests. | Sprint 1 |
| **FR-05** | Create Draft Survey | Survey Owners shall be able to create new survey headers with title, description, target category, and optional `minResponsesForSummary` privacy quorum threshold (`1..20`, default `3`; revised per Lab 7 Issue #35). | Sprint 1 (Rev. Lab 7) |
| **FR-06** | Question Authoring | Survey Owners shall add, edit, order, and delete questions (Text, Single Choice, Rating) within draft surveys. | Sprint 1 |
| **FR-07** | Update Draft Survey | Survey Owners shall edit metadata and question details while survey remains in `DRAFT` status. | Sprint 1 |
| **FR-08** | Publish Survey | Survey Owners shall transition a draft survey to `PUBLISHED` status, opening it for responses. | Sprint 1 |
| **FR-09** | Close Survey | Survey Owners shall transition a published survey to `CLOSED` status, terminating response collection. | Sprint 1 |
| **FR-10** | Browse Published Surveys | Authenticated Respondents shall list all currently `PUBLISHED` surveys available for submission. | Sprint 1 |
| **FR-11** | Inspect Survey Details | Respondents shall fetch survey details and active questions for published surveys. | Sprint 1 |
| **FR-12** | Submit Identified Response | Respondents shall submit answers to all required questions of a published survey under authenticated identity. | Sprint 1 |
| **FR-13** | Validation of Responses | Server shall validate that all required questions have valid answers adhering to question type rules. | Sprint 1 |
| **FR-14** | Duplicate Rejection | Server shall detect and reject subsequent response submissions from the same respondent for the same survey. | Sprint 1 |
| **FR-15** | Personal Submission History | Respondents shall view their own past submissions and verified answer records. | Sprint 1 |
| **FR-16** | Aggregate Result Summary | Survey Owners shall view aggregate statistics for their own published or closed surveys, subject to the k-anonymity privacy quorum while `PUBLISHED` and unlocked upon reaching quorum or `CLOSED` status (revised per Lab 7 Issue #35). | Sprint 1 (Rev. Lab 7) |
| **FR-17** | Metric Computation | Server shall calculate total responses, average scores for rating questions, and percentage counts for choice questions. | Sprint 1 |
| **FR-18** | Anonymous Response Mode | Survey Owners may enable anonymous mode where respondent identity is detached from response records with cryptographic proof. | Sprint 2 |
| **FR-19** | Eligibility Restrictions | Survey Owners shall specify respondent eligibility criteria (e.g., specific academic cohorts/departments). | Sprint 2 |
| **FR-20** | Automated Closing Deadline | Survey Owners shall set an expiry timestamp after which the survey automatically closes for submissions. | Sprint 2 |
| **FR-21** | Data Export (CSV/JSON) | Survey Owners shall export aggregated results and sanitized responses in standard CSV and JSON formats. | Sprint 3 |

---

## 5. Business Rules (BR)

| Rule ID | Statement of Business Rule | Enforcement Mechanism |
| :--- | :--- | :--- |
| **BR-01** | User accounts must strictly belong to either `SURVEY_OWNER` or `RESPONDENT` role; roles cannot be escalated via client request payload. | Backend JWT payload verification & role authorization middleware. |
| **BR-02** | A survey must contain a valid title (5–120 characters) and at least 1 configured question before it can be transitioned to `PUBLISHED`. | Service-layer validation during publish transaction. |
| **BR-03** | A survey can contain at most 30 questions (1–30 questions) to ensure comprehensive evaluation while preventing unbounded request payloads and unbounded database joins. | API request schema validation (Zod max(30)) & domain boundary check. |
| **BR-04** | Once a survey is transitioned to `PUBLISHED` or `CLOSED`, its title, description, questions, and options are immutable. | Pre-update check rejecting modifications if status $\neq$ `DRAFT`. |
| **BR-05** | Only surveys with status `PUBLISHED` shall accept response submissions. `DRAFT` and `CLOSED` surveys must reject submissions with error code `SURVEY_NOT_ACCEPTING_RESPONSES` (HTTP 400). | Submission controller status pre-check. |
| **BR-06** | A respondent can submit at most ONE response per survey. Any subsequent submission attempt must be rejected with error code `DUPLICATE_SUBMISSION` (HTTP 409). | Database composite unique constraint `@@unique([surveyId, respondentId])` and pre-flight query. |
| **BR-07** | A Survey Owner cannot submit responses to their own created surveys to prevent conflict of interest. | Server-side validation comparing `survey.ownerId` with `auth.userId`. |
| **BR-08** | Respondents are strictly forbidden from viewing another respondent's individual answers or submissions. | Query-scoping (`WHERE respondentId = auth.userId`) returning HTTP 403/404. |
| **BR-09** | *(Withdrawn per Change Proposal CP-02)* Replaced with explicit owner-controlled status transition and scheduled deadline. | Documented change governance in Part B. |
| **BR-10** | Survey aggregate analytics, question details of drafts, and closure controls are restricted strictly to the survey's author. *(Lab 7 Rev. #35):* While a survey is `PUBLISHED` and `totalResponses < minResponsesForSummary` (default `3`, configurable `1..20`), per-question analytics breakdowns and `SHORT_TEXT` answers are suppressed (`privacyLocked = true`) until quorum is met or the owner transitions the survey to `CLOSED`. | Ownership authorization guard (`survey.ownerId === auth.userId`) + AnalyticsService privacy quorum & lifecycle gate. |
| **BR-11** | User passwords must be stored using bcrypt with a work factor (cost) of 12; plaintext passwords are strictly forbidden. | Authentication model pre-save hook. |
| **BR-12** | Rating scale questions must accept numeric integer responses strictly within the inclusive range $[1, 5]$. | Input schema validation returning HTTP 422 if violated. |
| **BR-13** | Text questions marked as required must have non-empty answer strings between 1 and 1000 characters. | Payload validator trimming whitespace. |
| **BR-14** | When a survey is deleted (only permissible while in `DRAFT`), all associated questions and draft relations must cascade delete cleanly. | Database foreign key `ON DELETE CASCADE`. |

---

## 6. Non-Functional Requirements (NFR)

| NFR ID | Category | Requirement & Measurable Target | Verification Sprint & Method |
| :--- | :--- | :--- | :--- |
| **NFR-01** | Performance | API endpoints for survey retrieval and response submission must respond within $\le 500$ ms for 95th percentile under normal local load (50 req/sec). | Sprint 1: Integration & load benchmark test. |
| **NFR-02** | Security | Protected API endpoints must reject unauthenticated requests with HTTP 401 and unauthorized roles with HTTP 403, leaking zero protected data. | Sprint 1: Automated security unit & API tests (`TEST-03`, `TEST-04`). |
| **NFR-03** | Interface Consistency | All API responses must adhere to uniform JSON envelopes: `{ data: ... }` for success and `{ error: { code, message, details } }` for errors. | Sprint 1: API contract test suite. |
| **NFR-04** | Data Persistence | All domain entities must persist in a relational PostgreSQL database surviving container/service restart with zero data loss. | Sprint 1: Docker restart integration verification. |
| **NFR-05** | Credential Security | Passwords must be hashed using bcrypt (cost 12); no plaintext credentials stored or logged. | Sprint 1: Database inspection test. |
| **NFR-06** | Usability & States | UI must provide explicit Loading, Empty, Success, and Error states for all user journeys. | Sprint 1: E2E Playwright journey tests. |
| **NFR-07** | Maintainability & Types | TypeScript strict mode enabled across backend and frontend, achieving zero compiler errors. | Sprint 1: Build command check (`tsc --noEmit`). |
| **NFR-08** | Container Readiness | Entire application must package into standardized Docker containers with externalized environment configuration. | Sprint 2 / Lab 5: Docker build and run verification. |
| **NFR-09** | Cloud Deployability | Application must be deployable to GCP Cloud Run with Cloud SQL database connectivity. | Sprint 2 / Lab 5: GCP deployment check. |
| **NFR-10** | Seed Reproducibility | `npm run db:seed` command must execute idempotently, populating deterministic test accounts and sample surveys. | Sprint 1: CI seed test execution. |
| **NFR-11** | Zero Draft Leakage | Public survey discovery endpoints must never return draft surveys or their questions to non-owner users. | Sprint 1: API authorization test (`TEST-10`). |
| **NFR-12** | Privacy Guarantee | Individual response identities must not appear in aggregate survey summaries or statistical metrics; while `PUBLISHED`, per-question breakdowns are suppressed below `minResponsesForSummary` (Lab 7 Issue #35). | Sprint 1 / Lab 7: Automated tests (`TEST-28`, `TEST-L7-03`–`TEST-L7-05`). |

---

## 7. Architectural Decisions, Assumptions & Open Questions

### 7.1 Key Architectural Decisions (D-01 to D-10)
- **D-01: Full-Stack TypeScript Modular Monolith:** Organized into client/ (React 19 + Vite SPA) and server/ (Node.js + Express + Prisma ORM + PostgreSQL 16) workspaces. This delivers end-to-end type safety, high developer velocity, and avoids microservice network latency for Sprint 1.
- **D-02: Stateless JWT with Database Revocation Table:** Authentication issues signed HS256 JWT tokens containing a unique jti (JWT ID) with a 60-minute expiration (JWT_EXPIRES_IN=60m). On POST /api/v1/auth/logout, the server records jti into the RevokedToken PostgreSQL table; 
equireAuth middleware verifies both cryptographic validity and absence from RevokedToken.
- **D-03: Relational Integrity for Duplicate Prevention:** Single-submission rule (BR-06) is guaranteed at the database level via a composite unique constraint @@unique([surveyId, respondentId]) on table Response, paired with atomic Prisma transaction rollback to prevent concurrent race conditions.
- **D-04: Authoritative Server Calculations:** All aggregate statistics (mean rating score, score distributions, and choice percentages) are computed authoritatively on the backend via SQL/Prisma aggregation rather than relying on client-side calculation (F-12).
- **D-05: Idempotent Seed Provisioning:** Synthetic demo accounts (owner1@unipulse.edu, owner2@unipulse.edu, student1@unipulse.edu, student2@unipulse.edu) are seeded via prisma.user.upsert with bcrypt cost factor 12, ensuring repeatable, non-colliding evaluations.
- **D-06: Environment Variable & Secret Isolation:** Runtime configuration (DATABASE_URL, JWT_SECRET, PORT, NODE_ENV) is externalized into .env and documented in .env.example. Secrets are never committed into Git tracking.
- **D-07: Uniform REST JSON Envelopes & Error Taxonomy:** All API endpoints return uniform JSON responses: { data } on 2xx success and { error: { code, message, details } } on 4xx/5xx failure with safe error logging.
- **D-08: Target Cloud & Container Architecture:** The application is architected as a stateless container ready for multi-stage Docker build and Google Cloud Run deployment connected to Google Cloud SQL PostgreSQL.
- **D-09: TDD Discipline:** Core business rules (BR-02 non-empty publish guard, BR-05 closed rejection, BR-06 composite duplicate prevention, BR-07 owner response block, BR-12 rating [1, 5] bounds, and NFR-11 zero draft leakage) are verified through automated integration tests before release merge.
- **D-10: Git Workflow Governance:** Work progresses from GitHub Issue → Feature Branch → Pull Request into sprint-1 with mandatory teammate peer review before staging merge.

### 7.2 Project Assumptions & Resolved Open Questions
During Sprint 1 baseline planning and implementation, the engineering team recorded and resolved the following architectural assumptions and design questions:
1. **JWT Token Expiration Window (Assumption → Resolved):**
   - *Question:* How long should the access token remain valid to balance evaluation workflow convenience against stale session risk?
   - *Resolution:* Fixed at **60 minutes** (JWT_EXPIRES_IN=60m in server/.env and server/src/utils/jwt.ts). To handle immediate revocation on user sign-out, POST /api/v1/auth/logout inserts the token's jti into PostgreSQL RevokedToken, ensuring instant invalidation without waiting for the 60-minute window to elapse.
2. **Survey Closure in Sprint 1 (Change Proposal CP-01 → Resolved):**
   - *Question:* Should survey closure be deferred to Sprint 2 or included in Sprint 1?
   - *Resolution:* Moved manual closure (POST /api/v1/surveys/:id/close) into Sprint 1 under **CP-01** (approved). This allowed full verification of the DRAFT → PUBLISHED → CLOSED state machine, BR-05 (rejection of submissions to closed surveys), and respondent inspection of closed surveys in Sprint 1.
3. **Rating Question Support in Sprint 1 (Baseline Scope → Resolved):**
   - *Question:* Should rating questions be deferred or included alongside choice/text questions in Sprint 1?
   - *Resolution:* Included in Sprint 1 (F-04 and BR-12). Ratings accept integer values strictly in the range [1, 5], verified by unit tests (TEST-31 / TEST-34) and SQL mean calculation (F-12).
4. **Question Count Upper Bound (Validation Boundary → Resolved):**
   - *Question:* Should the survey question count be capped at 25 or 30 questions?
   - *Resolution:* Capped at **30 questions** (1 ≤ questions ≤ 30), enforced authoritatively by Zod schema (server/src/validators/surveyValidator.ts) and verified by TEST-12 in server/tests/survey.test.ts.
5. **Zero Draft Leakage HTTP Response Code (Security Policy → Resolved):**
   - *Question:* Should non-owners querying unreleased DRAFT surveys receive HTTP 403 Forbidden or HTTP 404 Not Found?
   - *Resolution:* Enforced as **HTTP 404 Not Found** (SURVEY_NOT_FOUND) across both catalog and detail endpoints (NFR-11). Returning 403 would leak the existence and ID of private drafts to attackers/respondents.
