# YoTouch Development Guide

## Repository structure

```
yotouch/
├─ frontend/         React + Vite + TypeScript + Tailwind
├─ backend/          Node.js + Express + Prisma + PostgreSQL
├─ ai-service/       Python + FastAPI + ONNX inference
├─ cardano-contract/ Aiken validator for proofs
└─ docker-compose.yml
```

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev  # Dev server on http://localhost:5173
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev  # Dev server on http://localhost:8080
```

### AI Service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .
uvicorn app.main:app --reload --port 9000
```

### Cardano Contract

```bash
cd cardano-contract
aiken check
```

### Full stack (Docker Compose)

```bash
docker-compose up
```

## One-week sprint plan

### Day 1 (Nov 25) – Foundation

- Confirm API contracts, establish repo, scaffold services
- Configure CI/CD skeleton (linting, test runners)
- Set up local dev environment

### Day 2 (Nov 26) – Vertical slice

- Frontend: Onboarding form + validator queue UI
- Backend: Identity endpoints + job queue hooks
- AI: Face embedding + liveness stubs
- Blockchain: Draft Aiken script + test suite

### Day 3 (Nov 27) – Integration

- Frontend: Wire biometric capture (WebRTC/upload fallback)
- Backend: Biometric ingestion, NIN/BVN API calls, encryption layer
- AI: Deploy inference microservice MVP
- Blockchain: Finalize proof schema, off-chain metadata format

### Day 4 (Nov 28) – Core workflows

- Frontend: Complete validator review flow + score visualization
- Backend: Scoring engine, reputation weighting, social-proof pipeline
- AI: Fine-tune accuracy, add anomaly heuristics
- Blockchain: Deploy to testnet, verification endpoint

### Day 5 (Nov 29) – End-to-end

- Full flow test: user → validators → score → Cardano proof
- Security hardening (rate limits, key rotation, audit logs)
- AI: Monitoring dashboards
- Blockchain: Webhook integration + replay protection

### Day 6 (Nov 30) – Polish

- UX refinement, accessibility audit, responsive design
- Backend: Load tests, OpenAPI docs, backup strategy
- AI: Benchmark report, calibration tuning
- Blockchain: Stress tests, verification CLI docs

### Day 7 (Dec 1) – Deployment

- Bug bash, finalize README/runbooks
- Record demo walkthrough
- Handoff deployment checklist (env templates, infra scripts)
- Buffer for critical hotfixes

## Team assignments

### Frontend Developer

- Onboarding + validator UI/UX
- Biometric capture components (camera, upload)
- Score dashboard with proof viewer
- Responsive layout, accessibility
- Storybook component library

### Backend Developer

- Secure onboarding API + encrypted storage
- Scoring engine with reputation weights
- Social-proof workflow orchestration
- Cardano proof submission service
- Docker compose + migration scripts

### AI/ML Developer

- Face embedding pipeline (ArcFace ONNX)
- Liveness detection (MediaPipe or custom)
- Fraud heuristics, confidence scoring
- Monitoring + evaluation reports
- Model registry setup

### Blockchain Developer

- Aiken validator contract + tests
- Off-chain worker for proof submission
- Verification CLI/API endpoint
- Testnet deployment + documentation
- Replay protection and metadata standards

## Key technologies

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, React Query, Zustand, React Router
- **Backend**: Node 20, Express, Prisma, PostgreSQL 15, Zod, Pino, Helmet
- **AI**: Python 3.11, FastAPI, ONNX Runtime, OpenCV, NumPy
- **Blockchain**: Aiken, Cardano testnet, CIP-68 metadata
- **Infra**: Docker Compose, GitHub Actions (planned)

## API Endpoints (planned)

### Backend

- `POST /api/identities` – Onboard new user
- `GET /api/scores` – Fetch scoreboard
- `GET /api/validator-queue` – Validator task list
- `POST /api/reviews` – Submit validator review
- `GET /api/proofs/:userId` – Retrieve Cardano proof

### AI Service

- `POST /api/embeddings` – Generate face embedding
- `POST /api/liveness` – Liveness check

## Environment variables

### Frontend

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCKS=true
```

### Backend

```
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/yotouch
CARDANO_WEBHOOK_URL=http://localhost:5050/proofs
AI_SERVICE_URL=http://localhost:9000
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_API_KEY=your_api_key
MONNIFY_SECRET_KEY=your_secret_key
MONNIFY_CONTRACT_CODE=your_contract_code
```

### AI Service

```
LOG_LEVEL=info
```

## Notes

- TypeScript errors in frontend will resolve after `npm install` completes successfully
- Disk space issue blocked full npm install; manually run `npm install` in frontend folder
- Prisma client will be generated after running `npx prisma generate` in backend
- Aiken toolchain must be installed separately: https://aiken-lang.org/installation-instructions

## Admin dashboard rollout (Dec 1)

1. **Data model** – extend `app_role` with `field_agent`, add `field_agent_profiles` + `primary_validator_applications` tables, wire RLS so agents manage their own records while admins have override policies.
2. **Supabase client** – regenerate types to surface the new tables/enum and expose helper metadata for the React app.
3. **Frontend UX** – ship `/admin` route gated by `has_role('admin')`, add overview metrics, field-agent leaderboard, validator onboarding pipeline, and per-application controls (status transitions + document audit).
4. **Integrations** – listen for realtime Supabase changes to keep stats live; fall back to manual refresh when metadata changes outside the current session.
5. **Next steps** – persist admin notes edits, expose assignment workflows (admin → primary validator), and connect backend queueing once those services land.

### Default admin bootstrap

- Run `cd new_frontend && npm install` (installs the new `dotenv` helper).
- Configure `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (or reuse `VITE_SUPABASE_URL`), and optionally override `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_FIRST_NAME`, `DEFAULT_ADMIN_LAST_NAME`.
- Execute `npm run seed:admin` inside `new_frontend`. The script will idempotently create the auth user (confirming email automatically) and upsert the corresponding `user_roles` row with `admin` privileges.

### Validator & field agent test accounts

- From `new_frontend`, run `npm run seed:test-accounts` to provision default primary validator, secondary validator, and field agent identities.
- Override the defaults via environment variables (e.g., `PRIMARY_VALIDATOR_TEST_EMAIL`, `FIELD_AGENT_TIER`) before running the script when needed.
- Default credentials:
  - Primary validator – `primary.validator@yotouch.local` / `ChangeMe@123`
  - Secondary validator – `secondary.validator@yotouch.local` / `ChangeMe@123`
  - Field agent – `field.agent@yotouch.local` / `ChangeMe@123`
  - Final-stage user (waiting for blockchain proof) – `final.stage@yotouch.local` / `ChangeMe@123`
- The script also seeds realistic NIN, BVN, and residential address fields so the facial-verification flow can progress past step 1 without manual database edits, and the final-stage user includes a populated `verification_requests` record (`status = verified`, profile still `pending`) to simulate "waiting for final proof" in the dashboard.
- The seeder is idempotent: rerunning it keeps existing accounts intact, ensures roles are assigned, and (for the field agent) bootstraps a `field_agent_profiles` record for quicker end-to-end testing.
