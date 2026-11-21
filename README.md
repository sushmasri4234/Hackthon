# CertiFlow — Pragati Skills Mission Certificate Issuance Platform

> **Hackathon submission** | Government Digital Certificate Workflow System

CertiFlow is a full-stack, multi-role web application that digitises the end-to-end lifecycle of skill-training certificates for the **Pragati Skills Mission (PSM)** programme. It replaces a manual, error-prone paper workflow with a structured approval pipeline, automated PDF certificate generation, and WhatsApp delivery.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Quick Start (Docker Compose)](#quick-start-docker-compose)
4. [Demo Credentials](#demo-credentials)
5. [Test Scenarios](#test-scenarios)
6. [API Endpoints](#api-endpoints)
7. [Design Decisions](#design-decisions)
8. [Limitations & Future Work](#limitations--future-work)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                     │
│  LoginPage  DashboardPage  BatchListPage  NewBatchPage         │
│  BatchDetailPage  ApprovalsPage  CertificatesPage  AuditPage   │
│  VerifyPage (public)                                           │
└───────────────────┬────────────────────────────────────────────┘
                    │  HTTP REST + Socket.IO (ws)
                    ▼
┌───────────────────────────────────────┐
│          nginx (port 5173→80)         │  ◄─ Docker
│  static SPA + reverse proxy /api,     │
│  /socket.io → backend:3001            │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│       Express API (port 3001)         │  ◄─ Docker
│  /api/auth  /api/batches             │
│  /api/certificates  /api/dashboard   │
│  /api/districts  /api/verify/:no     │
│  Socket.IO rooms: role:*, user:*, tc:*│
└───────┬────────────────┬─────────────┘
        │                │
        ▼                ▼
┌──────────────┐  ┌──────────────────────┐
│  PostgreSQL  │  │  Redis + BullMQ      │
│  (Prisma ORM)│  │  certificate-queue   │
│  port 5432   │  │  notification-queue  │
└──────────────┘  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Worker Process      │  ◄─ Docker (separate)
                  │  generateCertificates│
                  │  sendWhatsApp        │
                  └──────────────────────┘
```

**Approval pipeline:**

```
DRAFT → SUBMITTED → DISTRICT_REVIEW → QUALITY_REVIEW → STATE_REVIEW → APPROVED
                 ↘ RETURNED ↗ (loop)
                 ↘ REJECTED (terminal)
```

---

## Tech Stack

| Layer        | Technology                                           |
|--------------|------------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, React Router v6          |
| UI / Icons   | Lucide-React, custom CSS (dark theme, CSS variables) |
| State        | React Context (AuthContext), local useState/useEffect|
| HTTP Client  | fetch (via `src/lib/api.ts` wrapper)                 |
| Real-time    | Socket.IO client                                     |
| Backend      | Node.js 20, Express 5, TypeScript                    |
| ORM          | Prisma 5 (PostgreSQL)                                |
| Auth         | JWT (jsonwebtoken) + bcryptjs                        |
| Queues       | BullMQ on Redis 7                                    |
| PDF          | PDFKit                                               |
| QR Code      | qrcode                                               |
| Excel parse  | exceljs / fast-csv                                   |
| Logging      | Winston                                              |
| Testing      | Vitest                                               |
| Database     | PostgreSQL 15                                        |
| Cache / Queue| Redis 7                                              |
| Container    | Docker + Docker Compose                              |
| Reverse Proxy| nginx (alpine)                                       |

---

## Quick Start (Docker Compose)

> **Prerequisites:** Docker Desktop ≥ 24, Docker Compose v2

```bash
# 1. Clone and enter the project
git clone <repo-url> certiflow && cd certiflow

# 2. Launch all services (PostgreSQL, Redis, backend, worker, frontend)
docker compose up --build -d
```

> **Note:** The backend container automatically runs Prisma migrations and seeds all 6 demo accounts on initial boot!
> 
> Sample test spreadsheets are pre-generated in the `sample_data/` folder:
> - `sample_data/valid_candidates_batch.xlsx` (5 valid candidates)
> - `sample_data/invalid_candidates_batch.xlsx` (Fails validation: missing ID, duplicate, bad phone, high marks)
> - `sample_data/large_batch_60_candidates.xlsx` (60 candidates – triggers Quality Team review threshold)

The app is now live at **http://localhost:5173**  
The API is available at **http://localhost:3001**

---

## Demo Credentials

All users share the same password: **`Demo@1234`**

| # | Name           | Email                      | Role              | Scope                              |
|---|----------------|----------------------------|-------------------|------------------------------------|
| 1 | Anika Sharma   | anika@certiflow.demo       | TRAINING_CENTRE   | Pune Skill Development Centre      |
| 2 | Dev Kulkarni   | dev@certiflow.demo         | DISTRICT_OFFICER  | Pune district approvals            |
| 3 | Meera Joshi    | meera@certiflow.demo       | DISTRICT_OFFICER  | Pune district approvals (2nd officer) |
| 4 | Kabir Patel    | kabir@certiflow.demo       | DISTRICT_OFFICER  | Nashik district approvals          |
| 5 | Neha Gupta     | neha@certiflow.demo        | QUALITY_TEAM      | Quality review (all districts)     |
| 6 | Farah Khan     | farah@certiflow.demo       | STATE_OFFICE      | Final approval + audit + certificates |

---

## Test Scenarios

### Scenario 1 — Happy Path: Batch Created and Approved

1. Log in as **Anika** (Training Centre).
2. Go to **New Batch**, fill in course name, upload the sample Excel file.
3. Submit the batch → status changes to `DISTRICT_REVIEW`.
4. Log in as **Dev** (District Officer, Pune).
5. Open **Pending Approvals** → click the batch → Approve with a note.
6. Log in as **Neha** (Quality Team) → Approve the quality review.
7. Log in as **Farah** (State Office) → Final Approve.
8. Status changes to `APPROVED`; the worker generates PDFs and queues WhatsApp notifications.

### Scenario 2 — Rejection and Resubmission

1. As **Anika**, create and submit a batch.
2. As **Dev**, reject it with reason "Marks column missing".
3. As **Anika**, open the batch → see rejection reason → Edit & Resubmit.
4. Confirm `submissionCount` increments to 2.

### Scenario 3 — Return for Correction

1. Submit a batch as **Anika**.
2. As **Neha** (Quality Team), use the **Return** action with feedback.
3. As **Anika**, correct and resubmit → batch goes back to `QUALITY_REVIEW`.

### Scenario 4 — Large Batch (> 50 candidates) Async Generation

1. Upload an Excel file with 60+ candidates.
2. After state approval, observe `isLargeBatch: true` on the batch record.
3. Certificate generation is processed asynchronously by the worker process.
4. Real-time Socket.IO toast appears when certificates are ready.

### Scenario 5 — Certificate Verification (Public QR)

1. After certificates are generated, open any certificate PDF.
2. Scan the QR code (or visit `/verify/<CERT-NUMBER>`).
3. Confirm the public verification page shows valid certificate details without login.
4. As **Farah** (State Office), cancel the certificate with a reason.
5. Re-scan the QR → page shows `CANCELLED` status.

### Scenario 6 — Escalation / Delayed Batch Alert

1. As **Anika**, submit a batch.
2. Wait for the escalation scheduler to fire (or manually insert an `Escalation` row in the DB).
3. Log in as **Farah** → Dashboard shows escalation warning banner.
4. Open **Audit Page** → select the batch → timeline shows `ESCALATION_CREATED` entry.

---

## API Endpoints

### Auth
| Method | Path               | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | `/api/auth/login`  | No   | Returns JWT token + user |
| POST   | `/api/auth/logout` | Yes  | Audit log entry          |
| GET    | `/api/auth/me`     | Yes  | Returns current user     |

### Batches
| Method | Path                        | Auth | Description                       |
|--------|-----------------------------|------|-----------------------------------|
| GET    | `/api/batches`              | Yes  | List batches (filtered by role)   |
| POST   | `/api/batches`              | Yes  | Create new batch + upload Excel   |
| GET    | `/api/batches/:id`          | Yes  | Batch detail with candidates      |
| POST   | `/api/batches/:id/submit`   | Yes  | Submit batch for approval         |
| POST   | `/api/batches/:id/approve`  | Yes  | District / State approval         |
| POST   | `/api/batches/:id/reject`   | Yes  | Reject batch                      |
| POST   | `/api/batches/:id/return`   | Yes  | Return batch with feedback        |
| GET    | `/api/batches/:id/audit`    | Yes  | Audit trail for a batch           |

### Certificates
| Method | Path                            | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| GET    | `/api/certificates`             | Yes  | List certificates        |
| GET    | `/api/certificates/:id/download`| Yes  | Stream PDF download      |
| POST   | `/api/certificates/:id/cancel`  | Yes  | Cancel certificate       |

### Districts
| Method | Path              | Auth | Description                       |
|--------|-------------------|------|-----------------------------------|
| GET    | `/api/districts`  | No   | All districts + training centres  |

### Dashboard
| Method | Path                           | Auth | Description               |
|--------|--------------------------------|------|---------------------------|
| GET    | `/api/dashboard/stats`         | Yes  | KPI counters              |
| GET    | `/api/dashboard/delayed`       | Yes  | Escalated/delayed batches |
| GET    | `/api/dashboard/notifications` | Yes  | Recent notifications      |

### Public Verify
| Method | Path                      | Auth | Description                     |
|--------|---------------------------|------|---------------------------------|
| GET    | `/api/verify/:certNumber` | No   | Public certificate verification |

### Health
| Method | Path      | Auth | Description |
|--------|-----------|------|-------------|
| GET    | `/health` | No   | Liveness    |

---

## Design Decisions

### Prisma Serializable Transactions
Certificate generation inside `approvalWorkflowService` uses `prisma.$transaction(..., { isolationLevel: 'Serializable' })` to prevent two concurrent state-approval requests from both triggering certificate generation for the same batch. This guarantees exactly-once semantics under race conditions without an external distributed lock.

### Idempotent BullMQ Job IDs
Each certificate-notification job is enqueued with `jobId: 'notif-<certificateId>'`. BullMQ silently drops a job whose ID already exists in the queue, making the enqueue step safe to retry after a crash with no duplicate WhatsApp messages sent.

### 50-Candidate Threshold (`isLargeBatch`)
Batches with more than 50 candidates are flagged `isLargeBatch: true` at upload time. The API acknowledges the batch synchronously and defers PDF generation to the BullMQ worker process. This keeps the HTTP request under a 30-second timeout even for large datasets, while the client receives a real-time Socket.IO event when generation completes.

### Outbox Pattern (OutboxEvent)
Audit events and notification triggers are written to the `OutboxEvent` table in the same database transaction as the status change. A periodic worker polls this table and processes events, ensuring no event is lost if the application crashes between the DB write and the queue enqueue.

### Role-Based Data Scoping
Every database query on `Batch` and `Certificate` is conditionally filtered by `trainingCentreId` for `TRAINING_CENTRE` users. District officers see only batches in their `districtId`. This prevents horizontal privilege escalation without a separate permissions service.

---

## Limitations & Future Work

| Area | Current State | Future |
|------|---------------|--------|
| Notifications | WhatsApp via BullMQ queue; actual delivery mocked unless `WHATSAPP_API_URL` is set | Integrate Twilio / Gupshup WhatsApp Business API |
| Email | Not implemented | Add Nodemailer + SMTP or SendGrid |
| Excel validation | Basic column checks; marks range 0–100 | Full schema validation with detailed per-row error reports |
| PDF storage | Local filesystem volume | Move to S3-compatible object store (MinIO / AWS S3) |
| Search & filter | Basic status filter | Full-text search on candidate names, pagination on all endpoints |
| Multi-tenancy | Single state (MH) hard-coded | Multi-state support with state-scoped admin roles |
| Tests | Vitest unit tests for approval workflow | Integration tests with a test database; Playwright E2E |
| Observability | Winston logs | OpenTelemetry traces + Prometheus metrics |
| Auth | JWT in localStorage | Refresh tokens, httpOnly cookies, MFA |
| i18n | English only | Marathi / Hindi support |
