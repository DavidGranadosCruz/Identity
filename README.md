# Identity

Identity is an open-source web app for identity-preserving photo recreation.

Users can:
- create an Identity Pack with their own photos,
- analyze those photos with deterministic + multimodal analysis,
- upload a reference image,
- run structured reference analysis,
- generate real recreation variants asynchronously,
- persist all state in PostgreSQL,
- store and serve images from MinIO,
- run the full stack with Docker Compose.

## Architecture

- Frontend: Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui style primitives.
- Backend: Next.js Route Handlers + domain services + repositories.
- Data: PostgreSQL + Prisma ORM.
- Storage: MinIO (S3-compatible) with signed read URLs.
- Vision core: local deterministic face engine (face detection, landmarks/rotation, embedding, quality, consistency).
- Generation engine: FaceFusion in local headless runtime (no external generation API).
- Structured scene analysis: Gemini adapter (optional) behind provider interface.
- Async jobs: DB-backed queue (`Job` table) + dedicated `worker` service.

### Main folders

```txt
/app
/components
/lib
  /ai
  /db
  /storage
  /validation
  /utils
/server
  /repositories
  /services
  /workers
/prisma
/scripts
/tests
```

## Data model (Prisma)

`prisma/schema.prisma` includes:
- `User`
- `Session`
- `IdentityPack`
- `IdentityPackImage`
- `IdentityProfile`
- `ReferenceImage`
- `Generation`
- `GenerationVariant`
- `Job`
- `UserSettings`
- `AuditLog`

Auth.js compatibility models are also present:
- `Account`
- `VerificationToken`

## Docker services

`docker-compose.yml` defines:
1. `identity-web` (Next.js app)
2. `identity-worker` (job processor)
3. `identity-face` (headless swap runtime)
4. `identity-data` (persistent DB)
5. `identity-storage` (persistent object storage)
6. `identity-storage-init` (bucket bootstrap)

Persistent volumes:
- `postgres_data`
- `minio_data`
- `facefusion_data`

Healthchecks:
- Postgres: `pg_isready`
- MinIO: `/minio/health/live`
- FaceFusion: `python facefusion.py --version`
- Web: `/api/health`
- Worker: `:3001` health endpoint

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Or generate a safe local `.env` automatically (recommended):

```bash
pnpm env:setup
```

This command randomizes local secrets (`AUTH_SECRET`, `NEXTAUTH_SECRET`, MinIO credentials) so you do not reuse weak defaults.

Required:
- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_UPLOADS`
- `MINIO_BUCKET_GENERATIONS`
- `FACEFUSION_CONTAINER_NAME`
- `FACEFUSION_SHARED_DATA_PATH`
- `FACEFUSION_EXECUTION_PROVIDERS`
- `FACEFUSION_EXECUTION_THREAD_COUNT`
- `FACEFUSION_OUTPUT_IMAGE_QUALITY`
- `FACEFUSION_PROCESSORS_FAITHFUL`
- `FACEFUSION_PROCESSORS_EDITORIAL`
- `FACEFUSION_PROCESSORS_CINEMATIC`
- `FACEFUSION_COMMAND_TIMEOUT_MS`
- `FACEFUSION_KEEP_ARTIFACTS`

Optional (structured reference analysis):
- `GEMINI_API_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`

Worker tuning:
- `JOB_MAX_ATTEMPTS`
- `JOB_ANALYSIS_MAX_ATTEMPTS`
- `JOB_GENERATION_MAX_ATTEMPTS`
- `WORKER_POLL_INTERVAL_MS`
- `WORKER_HEALTH_PORT`
- `WORKER_ID`
- `IDENTITY_MIN_VALID_IMAGES`
- `IDENTITY_CLUSTER_SIMILARITY_THRESHOLD`
- `IDENTITY_VALIDITY_SIMILARITY_THRESHOLD`
- `GENERATION_IDENTITY_SIMILARITY_MIN`
- `GENERATION_REFERENCE_COMPOSITION_MIN`
- `GENERATION_BACKGROUND_PRESERVATION_MIN`
- `GENERATION_POSE_MATCH_MIN`
- `GENERATION_OVERALL_ACCEPTANCE_MIN`
- `GENERATION_VARIANT_MAX_RETRIES`
- `GENERATION_STRICT_MODERATION`

Auth.js compatibility:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Local run (Docker)

1. Create local env:

```bash
pnpm env:setup
```

2. Build and start:

```bash
docker compose up --build
```

3. Open app:
- `http://localhost:3000`

4. MinIO console:
- `http://localhost:9001`

Security note:
- Compose ports are bound to `127.0.0.1` by default, so services are only exposed on your local machine.
- Do not commit `.env` to GitHub.

## Local run (without Docker)

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm dev
```

In another terminal (worker):

```bash
pnpm worker
```

## Prisma and scripts

Available scripts:

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm minio:init
pnpm services:check
pnpm worker
```

## Product flow

1. Register / login.
2. Create or update your Identity Pack by uploading real images.
3. Worker analyzes each identity image with local face engine and stores real status/score/recommendation (no mock scores).
4. Worker rebuilds an `IdentityProfile` (single-identity clustering + consistency scoring). If identity is mixed, generation is blocked.
5. Upload a reference image.
6. Worker runs strict structured reference analysis (scene constraints only, not identity) and cross-checks face-count/quality with local vision.
7. Create a generation request.
8. Worker selects only identity-valid images, executes FaceFusion `headless-run` over shared `/data` assets, validates every variant with deterministic identity/composition/background/pose scoring, and rejects/retries failed outputs.
9. Review history and result detail pages with validation scores.

## API summary

- `POST /api/auth/register`
- `GET|POST /api/identity-packs`
- `PATCH /api/identity-packs/:id`
- `POST /api/identity-packs/:id/images/analyze`
- `DELETE /api/identity-packs/:id/images/:imageId`
- `GET|POST /api/references`
- `GET|POST /api/generations`
- `GET /api/generations/:id`
- `GET /api/generations/:id/variants/:variantId/download`
- `GET /api/jobs/:id`
- `GET|PATCH /api/user-settings`
- `GET /api/health`

## Tests

```bash
pnpm test
```

Included test coverage:
- schema validation tests,
- deterministic scoring tests,
- prompt/mapping tests,
- generation/job creation smoke test.

## Current limitations

- FaceFusion quality depends on input quality and chosen processors per variant.
- Generation latency depends on local CPU/GPU resources and queue load.
- Worker requires Docker socket access to execute headless FaceFusion commands.
- If Gemini is disabled, only deterministic local reference checks are available.
- No multi-tenant admin panel yet.

## Roadmap

- Better retry observability and admin job console.
- Rich audit browsing UI.
- Optional image moderation prefilter at upload time.
- Provider abstraction extensions beyond Gemini.
- Optional webhooks for generation completion.

## Responsible use and consent

Identity is built for ethical self-recreation workflows.

You must:
- upload only your own photos or consented material,
- avoid impersonation, harassment, fraud, or illegal use,
- follow local law and platform policies.

If moderation blocks a request, the system persists the real error/status and does not fabricate outputs.
