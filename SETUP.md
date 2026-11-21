# CertiFlow — Local Setup Guide

This guide describes how to run and test **CertiFlow** locally.

---

## 1. Prerequisites

- **Node.js**: v20 or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **Docker & Docker Compose** (Optional for containerized mode; Docker Desktop ≥ 24)

---

## 2. Option A: One-Click Local Run (Recommended for Immediate Testing)

If you are on Windows and want to test immediately without setting up Docker or external databases:

1. Double-click the provided script:
   ```cmd
   start-local.bat
   ```
2. Or run from PowerShell:
   ```powershell
   # Terminal 1: Backend Server (Port 3001)
   cd backend
   npm run standalone

   # Terminal 2: Frontend App (Port 5173)
   cd frontend
   npm run dev
   ```
3. Open your browser:
   - **Web Application**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)
   - **Public Verification**: [http://localhost:5173/verify](http://localhost:5173/verify)

---

## 3. Option B: Full Production-Equivalent Run (Docker Compose)

The multi-container architecture includes PostgreSQL 15, Redis 7, Express API, BullMQ Worker, and Nginx reverse proxy.

```bash
# 1. Clone and enter the repository
git clone <repository-url> certiflow
cd certiflow

# 2. Launch all services
docker compose up --build -d

# 3. Verify container health
docker compose ps
```

The database is automatically migrated and seeded with all 6 demo accounts on initial boot.

Access the services:
- **Frontend (Nginx)**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

To shut down:
```bash
docker compose down -v
```

---

## 4. Demo Accounts & One-Click Switching

Every demo account uses password: **`Demo@1234`**

On the login page, you can use the **Demo Accounts — One-Click Login** sidebar to switch roles instantly without typing credentials:

| Name | Role | Email | Purpose |
|---|---|---|---|
| **Anika Sharma** | `TRAINING_CENTRE` | `anika@certiflow.demo` | Upload batches, submit for approval, resubmit returned batches |
| **Dev Kulkarni** | `DISTRICT_OFFICER` | `dev@certiflow.demo` | First district approval (Pune District) |
| **Meera Joshi** | `DISTRICT_OFFICER` | `meera@certiflow.demo` | Second district approval (Distinct officer agreement required) |
| **Kabir Patel** | `DISTRICT_OFFICER` | `kabir@certiflow.demo` | District Officer (Nashik District) |
| **Neha Gupta** | `QUALITY_TEAM` | `neha@certiflow.demo` | Quality scrutiny for large batches (>50 candidates) |
| **Farah Khan** | `STATE_OFFICE` | `farah@certiflow.demo` | State final approval, certificate cancellation, audit log access |

---

## 5. Sample Data & Test Files

Three pre-generated Excel files are ready in the `sample_data/` directory:

1. `sample_data/valid_candidates_batch.xlsx`
   - 5 valid candidate records.
   - Use to test the standard approval pipeline from submission to certificate issuance.

2. `sample_data/invalid_candidates_batch.xlsx`
   - Contains missing mandatory candidate ID, missing name, invalid phone number, duplicate candidate ID, and marks > 100.
   - Use to test **atomic validation rejection** where no records are saved and row-by-row suggestions are displayed.

3. `sample_data/large_batch_60_candidates.xlsx`
   - 60 valid candidate records.
   - Exceeds the configurable 50-candidate threshold, routing the batch to the **Quality Team** before State Office approval.

---

## 6. Running Automated Tests

Run the complete Vitest test suite covering all 6 mandatory hackathon scenarios:

```bash
cd backend
npm test
```

To run with coverage:
```bash
npm run test:coverage
```
