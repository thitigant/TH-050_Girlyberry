# Lab 5 — Cloud Deployment & CI/CD Documentation (UniPulse)

**Team:** TH-050 Girlyberry  
**Members:** Jinjuta Nannarumit (`67070505210`, `@Ponatinylilbug`), Thitigan Surayothin (`67070505214`, `@thitigant`)  
**Repository:** `https://github.com/thitigant/TH-050_Girlyberry`  
**Live Public URL:** `https://s17b15028-4d7hbszvwq-as.a.run.app`  

---

## 1. Application Stack & Changes from Reference Stack

| Component | UniPulse Stack | Notes / Deviation from Starter Kit |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 8 (`client/`) | Built in multi-stage `Dockerfile` and served statically by Express (`/app/client/dist`). `cssMinify: false` configured in `client/vite.config.ts` for Alpine container compatibility. |
| Backend API | Node.js 24 + Express 4 + TypeScript (`server/`) | Exposes `/api/health`, `/api/ready`, `/api/v1/*`, and SPA fallback on a single port (`process.env.PORT`). |
| Database & ORM | PostgreSQL 16 + Prisma ORM 6 (`server/prisma/`) | Uses `prisma db push` for schema synchronization and `tsx prisma/seed.ts` for initial demo accounts. All application state (including revoked JWT tokens in `RevokedToken`) is persisted in PostgreSQL — nothing is stored solely in container memory or filesystem. |
| Containerization | Unified 3-stage `Dockerfile` + `docker-compose.yml` | Runs as non-root `node` user with `server/docker-entrypoint.sh` (`exec "$@"`) for proper Cloud Run `SIGTERM` handling. |
| Cloud Platform | Google Cloud Platform (CPE 334 Student Cloud Portal) | Provisioned inside shared course project `cpe-se-course-2026` (`asia-southeast1`) under team prefix `s17b15028`. Uses Artifact Registry, Cloud Run, Cloud Run Jobs, Cloud SQL for PostgreSQL, Secret Manager, and keyless Workload Identity Federation (WIF). |
| CI/CD | GitHub Actions (`.github/workflows/ci-docker.yml` & `.github/workflows/deploy.yml`) | `ci-docker.yml` runs required check `test-and-docker` on every PR into `staging`/`main`; `deploy.yml` (portal-generated) builds, tags with `$GITHUB_SHA`, migrates, and deploys on every merge into `main`. |

---

## 2. Environment Variables & Secret Management

No real `.env` files, passwords, connection strings, or service account keys are committed to Git. Only placeholder templates (`.env.example`, `client/.env.example`) are tracked.

### 2.1 Application Runtime Variables

| Variable | Purpose | Secret? | Source (Local) | Source (GCP Cloud Run) |
|---|---|---|---|---|
| `PORT` | HTTP listen port for Express server | No | `.env` / `docker-compose.yml` (`3000`) | Cloud Run runtime (`8080` default or `APP_PORT`) |
| `NODE_ENV` | Runtime mode (`development`, `test`, `production`) | No | `.env` / `docker-compose.yml` | `Dockerfile` (`production`) |
| `DATABASE_URL` | PostgreSQL connection string for Prisma | **Yes** | `.env` / `docker-compose.yml` | GCP Secret Manager (`s17b15028-database-url`) |
| `JWT_SECRET` | HS256 signing key for auth JWT tokens | **Yes** | `.env` / `docker-compose.yml` | GCP Secret Manager (`s17b15028-app-secret-1`) |
| `JWT_EXPIRES_IN` | Token expiration lifetime (`60m`) | No | `.env` / `docker-compose.yml` | Cloud Run env var (`60m`) |
| `VITE_API_URL` | Frontend API base URL (empty string for same-origin unified container) | No | `client/.env.example` | `Dockerfile` build arg (`""`) |

### 2.2 GitHub Actions Environment Variables (`demo` Environment — `main` Branch Only)

| Variable | Purpose | Secret? | Value / Source |
|---|---|---|---|
| `GCP_PROJECT_ID` | Target GCP Project ID | No | `cpe-se-course-2026` |
| `GCP_REGION` | Target GCP Region | No | `asia-southeast1` |
| `WIF_PROVIDER` | Workload Identity Provider resource path | No | `projects/670075229477/locations/global/workloadIdentityPools/s17b15028-pool/providers/s17b15028-provider` |
| `WIF_SERVICE_ACCOUNT` | Keyless deployer service account email | No | `s17b15028-deployer@cpe-se-course-2026.iam.gserviceaccount.com` |
| `MIGRATE_COMMAND` | Schema migration command run by `s17b15028-migrate` before deploy | No | `npx prisma db push` |

---

## 3. Build, Test, Run, Migrate, and Seed Commands

### Local Development & Verification (from a clean clone)

```bash
# 1. Copy environment template (fill in local placeholder values only)
cp .env.example .env

# 2. Install dependencies
npm --prefix server ci
npm --prefix client ci

# 3. Generate Prisma client, push schema, and seed baseline demo accounts
npm run prisma:generate
npm run prisma:db:push
npm run prisma:seed

# 4. Run automated tests (backend Vitest + Supertest & frontend typecheck/lint)
npm run test:server
npm run test:client

# 5. Build production artifacts
npm run build:server
npm run build:client
```

### Local Full-Stack Docker Run (C-03 Verification)

```bash
# Build and start PostgreSQL 16 + unified UniPulse container on http://localhost:3000
docker compose up --build -d

# Push schema and seed initial data into the containerized PostgreSQL database
docker compose exec app npx prisma db push
docker compose exec app npx tsx prisma/seed.ts

# Verify health and readiness endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

---

## 4. GCP Project, Region, and Resource Names

Provisioned via the **CPE 334 Student Cloud Portal** (do **not** run legacy `teardown.sh` or create extra Cloud SQL instances):

| Resource Type | Name / Value |
|---|---|
| GCP Project ID | `cpe-se-course-2026` |
| Region | `asia-southeast1` |
| Team Prefix | `s17b15028` |
| Cloud Run Service | `s17b15028` |
| Cloud Run Migration Job | `s17b15028-migrate` |
| Cloud SQL Instance | `s17b15028-pg` (`db-f1-micro`, PostgreSQL 16) |
| Cloud SQL Database & User | `s17b15028` / `s17b15028` |
| Cloud SQL Connection Name | `cpe-se-course-2026:asia-southeast1:s17b15028-pg` |
| Artifact Registry Repository | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s17b15028/s17b15028` |
| Runtime Service Account | `s17b15028-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| Deployer Service Account | `s17b15028-deployer@cpe-se-course-2026.iam.gserviceaccount.com` |
| Secret Manager Secrets | `s17b15028-database-url`, `s17b15028-admin-password`, `s17b15028-demo-password`, `s17b15028-app-secret-1` |
| Workload Identity Pool / Provider | `s17b15028-pool` / `s17b15028-provider` |

---

## 5. Repeatable Release Procedure (R-07, R-08)

1. **Create Issue:** Open a GitHub Issue labeled `lab5` describing the change.
2. **Develop on Feature Branch:** Branch off `staging` (`git checkout -b feat/<name> origin/staging`), implement the change, and run local tests.
3. **Pull Request into `staging`:** Open a PR into `staging` labeled `lab5`. Wait for CI (`test-and-docker`) to pass and obtain a specific teammate review approval (authors never approve their own PRs). Merge into `staging`.
4. **Release Pull Request into `main`:** Open a Release PR from `staging` into `main` labeled `lab5`. GitHub Ruleset enforces:
   - Pull Request review required,
   - Required status check **`test-and-docker`** must pass (failed checks block merge).
5. **Automated Cloud Deployment:** Upon merging into `main`, `.github/workflows/deploy.yml` automatically:
   - Authenticates to GCP via keyless Workload Identity Federation (`demo` environment),
   - Builds the root `Dockerfile` and pushes image `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s17b15028/s17b15028:<FULL_COMMIT_SHA>`,
   - Executes migration job `s17b15028-migrate` (`npx prisma db push`),
   - Deploys the new image to Cloud Run service `s17b15028` and prints the live Public URL in the Actions Job Summary.

### How to Verify Which Commit Is Running in Production (R-08)

Every deployed image is tagged with the exact 40-character Git commit SHA (`$GITHUB_SHA`). To verify the currently serving commit:

```bash
gcloud run services describe s17b15028 \
  --project=cpe-se-course-2026 \
  --region=asia-southeast1 \
  --format='value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)'
```

The tag after `:` in the returned image URI matches the exact `main` commit SHA shown in GitHub and the GitHub Actions deployment run.
