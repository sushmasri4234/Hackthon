# CertiFlow – Sample Test Data Files

This directory contains pre-generated, ready-to-upload spreadsheet test files for validating the **CertiFlow Skilling Certificate Issuance Platform**.

All files use standard headers that are automatically parsed and normalized by CertiFlow's atomic validation service:
`Candidate ID`, `Full Name`, `Phone`, `Email`, `Course Name`, `Training Centre`, `District`, `Marks`, `Completion Date`.

---

## Available Test Files

| File Name | Format | Candidates | State / District | Course Qualification | Primary Test Scenario |
|:---|:---:|:---:|:---|:---|:---|
| **`valid_candidates_batch.xlsx`** | XLSX | 5 | Maharashtra / Pune | Basic Computer Skills | Standard quick happy path (Dual District Approval -> State Approval -> Certificate Generation) |
| **`invalid_candidates_batch.xlsx`** | XLSX | 6 | Maharashtra / Pune | Basic Computer Skills | Atomic rejection test: Missing ID, missing name, invalid phone length, duplicate ID, marks > 100 |
| **`solar_technician_delhi_10_candidates.xlsx`** | XLSX | 10 | Delhi NCR / New Delhi | Solar PV Installer & Service Technician | Multi-state testing (Delhi NCR) |
| **`healthcare_assistant_bengaluru_15_candidates.xlsx`** | XLSX | 15 | Karnataka / Bengaluru Urban | General Duty Healthcare Assistant | South India skilling workflow (Karnataka) |
| **`data_analyst_hyderabad_12_candidates.xlsx`** | XLSX | 12 | Telangana / Hyderabad | Junior Data Analyst | IT / Software qualification workflow (Telangana) |
| **`automotive_ev_technician_mumbai_8_candidates.csv`** | CSV | 8 | Maharashtra / Mumbai City | Electric Vehicle Service Technician | Direct **CSV format** upload compatibility test |
| **`automotive_ev_technician_mumbai_8_candidates.xlsx`** | XLSX | 8 | Maharashtra / Mumbai City | Electric Vehicle Service Technician | Standard XLSX format for EV technicians |
| **`large_batch_60_candidates.xlsx`** | XLSX | 60 | Maharashtra / Pune | Advanced IT & Cloud Skills | **Quality Team Scrutiny Trigger**: Automatically flags batch (>50 candidates) for Neha Gupta's Quality Queue |
| **`mega_batch_75_candidates_noida.xlsx`** | XLSX | 75 | Uttar Pradesh / Noida | Embedded Systems & IoT Engineering | High-scale industrial batch with 75 candidates |

---

## How to Test Upload

1. Sign in as **Anika Sharma** (Training Centre) using the quick-switch button on the login screen, or register a new Training Centre account.
2. Navigate to **"New Batch"** (`/batches/new`).
3. Fill in the Batch Name and Course, and select the corresponding State and District.
4. Drag and drop any of the files above into the upload dropzone.
5. Watch instant atomic validation report either success or row-by-row error suggestions!
