# Sprint 2 Product Definition of Done (DoD) (Deliverable 2 — Part B)

- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)
- **Theme 10:** Review, Feedback, and Survey System (**UniPulse**)
- **Team:** TH-050 Girlyberry (`@thitigant` `67070505214`, `@Ponatinylilbug` `67070505210`)
- **Document Version:** 1.0.0 (Sprint 2 DoD — Issue #34)

---

## 1. Sprint 2 Definition of Done Checklist

A Sprint 2 feature (`F-13` through `F-17`) is considered **Done** only when all criteria below are satisfied and verified:

| Category | Mandatory Criterion | Verification Method |
| :--- | :--- | :--- |
| **1. Pre-Implementation Contract** | Feature SDS (`docs/sprints/sprint-2/features-sds.md`), numbered Acceptance Criteria (`AC-23`–`AC-35`), and STS (`docs/sprints/sprint-2/sts.md`, `TEST-35`–`TEST-54`) are committed and reviewed prior to feature implementation commits. | Git commit log & PR history (`#34`). |
| **2. Full-Stack Implementation** | Backend routes, controllers, Zod validators, Prisma schema/queries, and React UI components are implemented in TypeScript strict mode with zero compiler errors. | `npm run build:server` & `npm run build:client`. |
| **3. Automated Test Coverage** | Every Sprint 2 Acceptance Criterion (`AC-23`–`AC-35`) is verified by automated tests (`TEST-35`–`TEST-54`) covering normal flows, boundary/negative inputs, and role/ownership/privacy rules. | `npm run test:server` (0 failed, 0 skipped). |
| **4. Sprint 1 Regression Safety** | All 81 Sprint 1 baseline automated tests continue to pass without weakening, deleting, or skipping any existing assertions. | Full Vitest regression run (`server/tests/*.test.ts`). |
| **5. Peer Review & CI Gate** | Feature branch is opened as a Pull Request into `staging`, passes the required `test-and-docker` GitHub Actions check, and receives substantive review approval from the teammate (no self-approval). | GitHub PR review & Actions logs. |
| **6. Cloud Deployment & Persistence** | Release PR from `staging` into `main` triggers `.github/workflows/deploy.yml`, updates Cloud SQL schema (`s17b15028-migrate`), deploys to Google Cloud Run (`https://s17b15028-4d7hbszvwq-as.a.run.app`), and passes live post-deployment verification. | GitHub Actions deploy summary & live Cloud Run revision check. |
