# CPE 334 Lab 6 — Part A: Sprint 1 User Acceptance Test (UAT) Plan & Safe Handoff Package

- **Product Team:** Team TH-050 Girlyberry
  - **Student 1:** Thitigant Surayothin (`67070505214`, GitHub: `@thitigant`)
  - **Student 2:** Jinjuta Nannarumit (`67070505210`, GitHub: `@Ponatinylilbug`)
- **Theme 10:** Review, Feedback, and Survey System — **UniPulse: Campus Feedback & Course Survey Platform**
- **Public Repository URL:** https://github.com/thitigant/TH-050_Girlyberry
- **Sprint 1 Baseline Tag / Release Commit:**
  - **Original Sprint 1 Baseline Tag:** `v1.0-sprint1` (Commit `9a0ede4` / Release PR #17 `3dc7521`)
  - **Tested Deployed Cloud Run Release Commit:** `0405ffd` (PR #28 on `main`, serving badge `Cloud v1.1`)
- **Deployed Public Application URL (GCP Cloud Run):**
  - **Live URL:** https://s17b15028-4d7hbszvwq-as.a.run.app
  - **Health / Readiness Probes:**
    - `GET https://s17b15028-4d7hbszvwq-as.a.run.app/api/health`
    - `GET https://s17b15028-4d7hbszvwq-as.a.run.app/api/ready`

---

## 1. Accepted-for-Test Sprint 1 Scope & Exclusions

### 1.1 In-Scope Sprint 1 Features (Assessed in Lab 6 UAT)
| Feature ID | Feature Name | Linked Requirements & Rules | Sprint 1 Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **F-01** | User Authentication & Session Management | `FR-01`..`FR-04`, `BR-01`, `BR-11`, `NFR-02`, `NFR-05` | `AC-01`..`AC-04` |
| **F-02** | Server-Side Role & Ownership Authorization Guards | `BR-01`, `BR-07`, `BR-08`, `BR-10`, `NFR-02` | `AC-05`..`AC-07` |
| **F-03** | Create Draft Survey Header with Validation Limits | `FR-05`, `BR-02`, `BR-03`, `NFR-03` | `AC-08`, `AC-10` |
| **F-04** | Survey Question Authoring (`RATING`, `SINGLE_CHOICE`, `SHORT_TEXT`) | `FR-06`, `FR-07`, `BR-02`..`BR-04`, `BR-12`..`BR-14` | `AC-09`..`AC-11` |
| **F-05** | Survey Lifecycle Management (`DRAFT` → `PUBLISHED` → `CLOSED`) | `FR-08`, `FR-09`, `BR-02`, `BR-04`, `BR-05`, `BR-10` | `AC-12`..`AC-14` |
| **F-06** | Browse Published Surveys Catalog | `FR-10`, `BR-05`, `NFR-06`, `NFR-11` | `AC-15` |
| **F-07** | Survey Details & Ordered Question Rendering (Zero Draft Leakage) | `FR-11`, `BR-05`, `NFR-06`, `NFR-11` | `AC-15` |
| **F-08** | Response Submission & PostgreSQL Persistence | `FR-12`, `FR-13`, `BR-05`, `BR-07`, `BR-12`, `BR-13` | `AC-15`, `AC-16`, `AC-18`, `AC-19` |
| **F-09** | Single-Submission Enforcement & Duplicate Prevention (HTTP 409) | `FR-14`, `BR-06`, `NFR-03` | `AC-17` |
| **F-10** | Personal Submission History & Confirmation Receipts | `FR-15`, `BR-08`, `NFR-02` | `AC-07`, `AC-15` |
| **F-12** | Owner Aggregate Results Summary Dashboard | `FR-16`, `FR-17`, `BR-10`, `NFR-04`, `NFR-12` | `AC-20`..`AC-22` |

### 1.2 Explicit Exclusions (Sprint 2 & Sprint 3 Features — Not Assessed in Sprint 1 UAT)
- Anonymous cryptographic detachment (`F-13`), multi-select checkbox / matrix question types (`F-14`), automated scheduled cutoff UI (`F-15`), cohort enrollment restriction (`F-16`), survey template cloning (`F-17`), and CSV/JSON file export (`F-19`).

---

## 2. Safe Test Accounts, Data Setup & Cleanup Instructions

### 2.1 Synthetic Test Account Labels & Roles (No Secret Values in PDF)
> **Security Note (R-02 / Lab 6 Section 3.1):** Synthetic test account passwords are provided **privately** to the UAT Team via the private course handoff channel and are intentionally omitted from the public repository and PDF report. On the live UI, testers may use the **Quick Demo Login (CPE 334 Evaluator)** buttons for `OWNER_1` (`Owner (Alice)`) and `STUDENT_1` (`Student (Charlie)`), or type the email and private handoff password directly for `OWNER_2` and `STUDENT_2`.

| Account Label | Synthetic Email | Assigned Role | Purpose in UAT Execution |
| :--- | :--- | :--- | :--- |
| **`OWNER_1`** | `owner1@unipulse.edu` | `SURVEY_OWNER` | Primary instructor account for creating, publishing, closing, and inspecting analytics of own surveys (`UAT-01`, `UAT-02`, `UAT-04`, `UAT-06`). |
| **`OWNER_2`** | `owner2@unipulse.edu` | `SURVEY_OWNER` | Secondary instructor account used to verify cross-owner isolation (`403 FORBIDDEN_OWNERSHIP` / `404 SURVEY_NOT_FOUND` on `OWNER_1` surveys in `UAT-05`). |
| **`STUDENT_1`** | `student1@unipulse.edu` | `RESPONDENT` | Primary student respondent account for browsing published surveys, submitting feedback, testing duplicate prevention (`409 Conflict`), and checking receipts (`UAT-01`, `UAT-03`, `UAT-04`, `UAT-06`). |
| **`STUDENT_2`** | `student2@unipulse.edu` | `RESPONDENT` | Secondary student respondent account for independent submission and cross-respondent receipt privacy testing (`UAT-05`). |

### 2.2 Execution Sequence, Data Setup & Reset / Cleanup Instructions
- **Execution Order:** Execute **`UAT-01` → `UAT-02` → `UAT-03` → `UAT-04` → `UAT-05` → `UAT-06`** in order (or use a unique suffix such as `[UAT-Run-1]` in the survey title created during `UAT-01` so multiple test runs never collide).
- **Cleanup / Reset Procedure:**
  1. Survey Owners (`OWNER_1`) can delete any test survey created during UAT by clicking the **`Delete`** button on the survey card in **My Surveys & Lifecycle** (`DELETE /api/surveys/:id`).
  2. Before switching roles or starting a fresh session, testers click **`Sign Out`** in the top-right header (`POST /api/auth/logout`).

---

## 3. Executable Sprint 1 UAT Test Cases (6 Cases Covering All 4 Required Categories)

### Overview of UAT Cases
| Case ID | Required Lab 6 Category | Feature & Requirement / AC Reference | Primary Actor | Summary of Verification |
| :--- | :--- | :--- | :--- | :--- |
| **`UAT-01`** | **1. Normal Domain Journey (Part 1: Owner)** | `F-01`, `F-03`, `F-04`, `F-05` (`FR-02`, `FR-05`..`FR-08`, `BR-02`, `AC-02`, `AC-08`, `AC-09`, `AC-12`) | `SURVEY_OWNER` (`OWNER_1`) | Sign in as Owner, create a draft survey with 3 question types (`RATING`, `SINGLE_CHOICE`, `SHORT_TEXT`), and publish it (`DRAFT` → `PUBLISHED`). |
| **`UAT-02`** | **1. Normal Domain Journey (Part 2: Respondent & Analytics)** | `F-06`, `F-07`, `F-08`, `F-10`, `F-12` (`FR-10`..`FR-13`, `FR-15`..`FR-17`, `AC-15`, `AC-20`, `AC-21`) | `RESPONDENT` (`STUDENT_1`) & `SURVEY_OWNER` (`OWNER_1`) | Sign in as Student, browse published catalog, submit valid answers, receive official receipt ID, and verify Owner Analytics Dashboard updates without exposing respondent PII. |
| **`UAT-03`** | **2. Business-Rule & Boundary Rejection (Duplicate Submission)** | `F-09` (`FR-14`, `BR-06`, `AC-17`) | `RESPONDENT` (`STUDENT_1`) | Attempt a second submission to the same survey under the same respondent account; verify `HTTP 409 Conflict` (`DUPLICATE_SUBMISSION`) rejection and unchanged response count. |
| **`UAT-04`** | **2. Business-Rule & Boundary Rejection (Invalid Credentials & Closed Survey Block)** | `F-01`, `F-05`, `F-08` (`FR-02`, `FR-09`, `BR-02`, `BR-05`, `AC-02`, `AC-14`, `AC-16`) | `GUEST`, `SURVEY_OWNER` (`OWNER_1`), `RESPONDENT` (`STUDENT_2`) | Verify wrong password rejection (`401`), close the published survey (`PUBLISHED` → `CLOSED`), and verify submissions to a `CLOSED` survey are blocked (`400 SURVEY_NOT_ACCEPTING_RESPONSES`). |
| **`UAT-05`** | **3. Forbidden Role & Ownership Access Restriction** | `F-02`, `F-07`, `F-10`, `F-12` (`BR-01`, `BR-07`, `BR-08`, `BR-10`, `NFR-02`, `NFR-11`, `AC-05`..`AC-07`, `AC-18`, `AC-22`) | `RESPONDENT` (`STUDENT_1`) & `SURVEY_OWNER` (`OWNER_2`) | Verify Respondent cannot create/publish surveys (`403 FORBIDDEN_ROLE`) or see unowned `DRAFT` surveys (`404` Zero Draft Leakage), and `OWNER_2` cannot view analytics or close `OWNER_1`'s survey (`403 FORBIDDEN_OWNERSHIP`). |
| **`UAT-06`** | **4. State, History & Cloud SQL Database Persistence** | `F-01`, `F-08`, `F-10`, `F-12` (`FR-04`, `FR-15`, `NFR-04`, `AC-04`, `AC-15`, `AC-20`) | `RESPONDENT` (`STUDENT_1`) & `SURVEY_OWNER` (`OWNER_1`) | Sign out (`RevokedToken` invalidation), sign back in (or refresh in a clean browser window), and verify that created surveys, lifecycle states, submission receipts, and aggregate counts persist in Cloud SQL PostgreSQL. |

---

### Detailed Case Specifications

#### Case `UAT-01`: Owner Authentication, Draft Survey Authoring & Lifecycle Publication
- **Category:** Normal Domain Journey (Owner Flow)
- **Requirements & AC:** `FR-02`, `FR-05`, `FR-06`, `FR-07`, `FR-08`, `BR-02`, `BR-03` | `AC-02`, `AC-08`, `AC-09`, `AC-12`
- **Role / Account:** `SURVEY_OWNER` (`OWNER_1`: `owner1@unipulse.edu`)
- **Preconditions:** Application is accessible at `https://s17b15028-4d7hbszvwq-as.a.run.app`; tester is signed out.
- **Synthetic Inputs:**
  - **Survey Title:** `UAT Sprint 1 Verification Survey [Run-1]`
  - **Category:** `Course Evaluation`
  - **Description:** `Independent UAT verification of survey authoring, publishing, and response aggregation.`
  - **Initial Status:** `DRAFT` (Save as Draft)
  - **Question 1:** Prompt = `Rate the clarity of course requirements (1-5)`, Type = `Rating (1 - 5 Stars)`, Required = `true`
  - **Question 2:** Prompt = `Which verification phase is currently running?`, Type = `Single Choice`, Required = `true`, Options = `Unit Testing`, `Independent UAT`
  - **Question 3:** Prompt = `Any additional comments for the product team?`, Type = `Short Text`, Required = `true`
- **Numbered User Actions:**
  1. Open `https://s17b15028-4d7hbszvwq-as.a.run.app` and sign in as `OWNER_1` (`owner1@unipulse.edu`).
  2. Click the **`Create Draft Survey`** tab (or **`+ Create New Survey`** button).
  3. Enter the Synthetic Inputs above for Survey Title, Category, Description, and configure Question 1 (`Rating`), Question 2 (`Single Choice` with 2 options), and Question 3 (`Short Text`). Ensure status is set to **`Save as Draft (DRAFT)`**.
  4. Click **`Create Draft Survey`**.
  5. In **My Surveys & Lifecycle**, locate `UAT Sprint 1 Verification Survey [Run-1]` and verify its badge is **`DRAFT`**.
  6. Click the **`Publish Survey`** button on the `UAT Sprint 1 Verification Survey [Run-1]` card.
- **Expected Observable Results:**
  - Step 1: Login succeeds (`HTTP 200`); header displays badge `SURVEY_OWNER` and `owner1@unipulse.edu`.
  - Step 4–5: Survey is created in PostgreSQL (`POST /api/surveys` returns `201 Created`) and appears in the Owner dashboard with status **`DRAFT`** and `3 Questions`.
  - Step 6: Status transitions atomically from **`DRAFT`** to **`PUBLISHED`** (`POST /api/surveys/:id/publish` returns `200 OK` with non-null `publishedAt`).

---

#### Case `UAT-02`: Respondent Discovery, Feedback Submission, Confirmation Receipt & Owner Analytics
- **Category:** Normal Domain Journey (Respondent & Aggregation Flow)
- **Requirements & AC:** `FR-10`, `FR-11`, `FR-12`, `FR-13`, `FR-15`, `FR-16`, `FR-17`, `BR-10`, `BR-12`, `BR-13`, `NFR-12` | `AC-15`, `AC-19`, `AC-20`, `AC-21`
- **Role / Account:** `RESPONDENT` (`STUDENT_1`: `student1@unipulse.edu`) then `SURVEY_OWNER` (`OWNER_1`: `owner1@unipulse.edu`)
- **Preconditions:** `UAT-01` is complete (`UAT Sprint 1 Verification Survey [Run-1]` is in `PUBLISHED` status).
- **Synthetic Inputs:**
  - **Q1 (Rating):** `5`
  - **Q2 (Single Choice):** `Independent UAT`
  - **Q3 (Short Text):** `UAT normal submission verified on Cloud Run.`
- **Numbered User Actions:**
  1. Click **`Sign Out`**, then sign in as `STUDENT_1` (`student1@unipulse.edu`).
  2. In **`Browse & Take Surveys`**, verify that `UAT Sprint 1 Verification Survey [Run-1]` is listed with status **`PUBLISHED`**, and click **`Take Survey →`**.
  3. Select Rating **`5`** for Q1, select **`Independent UAT`** for Q2, type `UAT normal submission verified on Cloud Run.` for Q3, and click **`Submit Survey Response`**.
  4. Observe the confirmation screen and record the generated **Receipt ID** (e.g., `rsp_...` or `rcpt_...`).
  5. Click the **`My Submission Receipts`** tab in the top navigation bar and inspect the receipt list.
  6. Click **`Sign Out`**, sign back in as `OWNER_1` (`owner1@unipulse.edu`), find `UAT Sprint 1 Verification Survey [Run-1]`, and click **`View Analytics`**.
- **Expected Observable Results:**
  - Step 2: Respondent catalog displays only `PUBLISHED` surveys (any `DRAFT` surveys remain invisible per `NFR-11`).
  - Step 3–4: Submission succeeds (`POST /api/surveys/:id/responses` returns `HTTP 201 Created`). A green confirmation card displays the unique **Receipt ID** and timestamp.
  - Step 5: `My Submission Receipts` lists the receipt for `UAT Sprint 1 Verification Survey [Run-1]`.
  - Step 6: Owner Analytics Dashboard (`GET /api/surveys/:id/summary`) displays `Total Responses: 1`, Q1 average score `5.00 / 5.0` (100% on 5 stars), Q2 `Independent UAT` = `1 (100%)`, and Q3 text response, with **zero respondent email/ID/PII exposed** (`AC-21` / `NFR-12`).

---

#### Case `UAT-03`: Duplicate Submission Rejection (`BR-06` Single-Submission Enforcement)
- **Category:** Business-Rule & Boundary Case
- **Requirements & AC:** `FR-14`, `BR-06`, `NFR-03` | `AC-17`
- **Role / Account:** `RESPONDENT` (`STUDENT_1`: `student1@unipulse.edu`)
- **Preconditions:** `STUDENT_1` has already submitted a response to `UAT Sprint 1 Verification Survey [Run-1]` in `UAT-02`.
- **Synthetic Inputs:**
  - Attempted repeat answers on `UAT Sprint 1 Verification Survey [Run-1]`: Q1 = `2`, Q2 = `Unit Testing`, Q3 = `Duplicate attempt that must be rejected.`
- **Numbered User Actions:**
  1. Sign in as `STUDENT_1` (`student1@unipulse.edu`).
  2. In **`Browse & Take Surveys`**, locate `UAT Sprint 1 Verification Survey [Run-1]`. Observe that the card displays the **`✓ Submitted`** badge.
  3. Click **`Test Duplicate (409) →`** on that survey card to attempt a second submission to the backend API.
  4. Fill in Q1 = `2`, Q2 = `Unit Testing`, Q3 = `Duplicate attempt that must be rejected.`, and click **`Submit Survey Response`**.
- **Expected Observable Results:**
  - Step 4: The server and PostgreSQL unique constraint `(surveyId, respondentId)` reject the duplicate submission with **`HTTP 409 Conflict`** (`DUPLICATE_SUBMISSION`).
  - A red alert banner displays the `HTTP 409 Conflict: Duplicate submission rejected` message.
  - Protected state is unchanged: total response count for the survey remains `1` and the original rating average remains `5.00`.

---

#### Case `UAT-04`: Invalid Authentication Rejection & Closed Survey Submission Block (`BR-05`)
- **Category:** Business-Rule & Boundary Case
- **Requirements & AC:** `FR-02`, `FR-09`, `BR-05`, `BR-13` | `AC-02`, `AC-14`, `AC-16`
- **Role / Account:** `GUEST`, `SURVEY_OWNER` (`OWNER_1`), and `RESPONDENT` (`STUDENT_2`: `student2@unipulse.edu`)
- **Preconditions:** `UAT Sprint 1 Verification Survey [Run-1]` is currently `PUBLISHED`.
- **Synthetic Inputs:**
  - Invalid login test: Email = `student1@unipulse.edu`, Password = `WrongPassword999!`
- **Numbered User Actions:**
  1. While signed out on the Sign-In card, enter Email `student1@unipulse.edu` and Password `WrongPassword999!`, then click **`Sign In`**.
  2. Sign in with valid credentials as `OWNER_1` (`owner1@unipulse.edu`).
  3. In **My Surveys & Lifecycle**, locate `UAT Sprint 1 Verification Survey [Run-1]` (`PUBLISHED`) and click **`Close Survey`**.
  4. Verify the survey card status badge changes to **`CLOSED`**.
  5. Verify via the respondent catalog (sign in as `STUDENT_2`: `student2@unipulse.edu`) or via API (`POST /api/surveys/<surveyId>/responses` with `STUDENT_2`'s Bearer token) that the `CLOSED` survey no longer accepts responses.
- **Expected Observable Results:**
  - Step 1: Backend returns `HTTP 401 Unauthorized` (`INVALID_CREDENTIALS`); UI stays on Sign-In screen and shows red alert banner **`Invalid email or password`**.
  - Step 3–4: `POST /api/surveys/:id/close` transitions status to **`CLOSED`** and records `closedAt`.
  - Step 5: `CLOSED` surveys are excluded from the active respondent catalog, and any direct `POST /api/surveys/:id/responses` call to a `CLOSED` survey is rejected by the backend with **`HTTP 400 Bad Request`** (`code: "SURVEY_NOT_ACCEPTING_RESPONSES"`).

---

#### Case `UAT-05`: Forbidden Role (`403 FORBIDDEN_ROLE`), Ownership (`403 FORBIDDEN_OWNERSHIP`) & Zero Draft Leakage (`404`)
- **Category:** Forbidden Role / Ownership Access Restriction Case
- **Requirements & AC:** `BR-01`, `BR-07`, `BR-08`, `BR-10`, `NFR-02`, `NFR-11` | `AC-05`, `AC-06`, `AC-07`, `AC-18`, `AC-22`
- **Role / Account:** `RESPONDENT` (`STUDENT_1`: `student1@unipulse.edu`) and `SURVEY_OWNER` (`OWNER_2`: `owner2@unipulse.edu`)
- **Preconditions:** `OWNER_1` owns existing surveys (including a `DRAFT` survey such as `srv_cpe334_002` or a newly saved draft, and `srv_cpe334_001`).
- **Synthetic Inputs & Verification Steps (UI + Direct API Check via Browser DevTools Console / `curl`):**
  1. **UI Role Restriction Check:** Sign in as `STUDENT_1` (`RESPONDENT`). Verify the navigation bar only provides respondent tabs (`Browse & Take Surveys`, `My Submission Receipts`, `Public Results Summary`) and does **not** expose survey creation or lifecycle controls.
  2. **Backend Role Restriction Check (`AC-05`):** Using `STUDENT_1`'s JWT token, send a direct request to create a survey:
     ```javascript
     // Run in Browser DevTools Console while signed in as student1@unipulse.edu, or via curl:
     fetch('/api/surveys', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
       body: JSON.stringify({ title: 'Unauthorized Student Survey', questions: [] })
     }).then(r => r.json().then(b => console.log(r.status, b)));
     ```
  3. **Zero Draft Leakage Check (`NFR-11`):** As `STUDENT_1`, verify `OWNER_1`'s `DRAFT` survey (`Faculty Research Seminar Feedback (Draft)` / `srv_cpe334_002`) does not appear in `Browse & Take Surveys`, and requesting `GET /api/surveys/<draftSurveyId>` returns `HTTP 404` (`SURVEY_NOT_FOUND`).
  4. **Cross-Owner Analytics & Lifecycle Denial (`AC-06`, `AC-22`):** Sign in as `OWNER_2` (`owner2@unipulse.edu`, who does not own `OWNER_1`'s survey) and request `GET /api/surveys/srv_cpe334_001/summary` or `POST /api/surveys/srv_cpe334_001/close` with `OWNER_2`'s Bearer token.
- **Expected Observable Results:**
  - Step 2: Backend rejects respondent survey creation with **`HTTP 403 Forbidden`** and `{ "error": { "code": "FORBIDDEN_ROLE" } }`.
  - Step 3: Draft survey is completely hidden from respondent catalog and returns **`HTTP 404 Not Found`** (`SURVEY_NOT_FOUND`).
  - Step 4: Backend rejects `OWNER_2` accessing `OWNER_1`'s analytics or closing `OWNER_1`'s survey with **`HTTP 403 Forbidden`** and `{ "error": { "code": "FORBIDDEN_OWNERSHIP" } }`.

---

#### Case `UAT-06`: Session Revocation & Cloud SQL Database Persistence Across Reload / Re-Login
- **Category:** State, History & Persistence Case
- **Requirements & AC:** `FR-04`, `FR-15`, `FR-16`, `NFR-04` | `AC-04`, `AC-15`, `AC-20`
- **Role / Account:** `RESPONDENT` (`STUDENT_1`) and `SURVEY_OWNER` (`OWNER_1`)
- **Preconditions:** `UAT-01` through `UAT-04` have been executed on `https://s17b15028-4d7hbszvwq-as.a.run.app`.
- **Numbered User Actions:**
  1. While signed in as `STUDENT_1`, click **`Sign Out`** (`POST /api/auth/logout`).
  2. Open a fresh browser tab or reload `https://s17b15028-4d7hbszvwq-as.a.run.app` (or clear `localStorage` and sign in again as `STUDENT_1`: `student1@unipulse.edu`).
  3. Open **`My Submission Receipts`** and verify the receipt from `UAT-02` is fetched from the backend database (`GET /api/surveys/:id/responses/me`).
  4. Sign out and sign in as `OWNER_1` (`owner1@unipulse.edu`).
  5. In **`My Surveys & Lifecycle`**, verify that `UAT Sprint 1 Verification Survey [Run-1]` is still present with its updated **`CLOSED`** status and that clicking **`View Analytics`** still retrieves the persisted response summary (`Total Responses: 1`, Average Rating `5.00`) from Cloud SQL PostgreSQL.
- **Expected Observable Results:**
  - Step 1: Token `jti` is recorded in PostgreSQL `RevokedToken`; any reuse of the logged-out JWT returns `HTTP 401` (`TOKEN_REVOKED`).
  - Step 3: `STUDENT_1`'s submission receipt and answers persist across reload/re-login.
  - Step 5: `OWNER_1`'s created survey, `CLOSED` lifecycle state, and aggregated response statistics persist in Google Cloud SQL PostgreSQL without data loss.
