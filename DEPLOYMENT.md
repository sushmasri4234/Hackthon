# CertiFlow — Production Deployment & Scale Architecture

This document outlines the production deployment strategy for **CertiFlow**, designed to support the **Pragati Skills Mission** at scale.

---

## 1. Production Target Scale

| Metric | Target |
|---|---|
| Registered Users | 100,000 users across 300+ training centres & 36 districts |
| Daily Active Users (DAU) | ~10,000 concurrent reviewers, officers & trainees |
| Peak Batch Approval Load | 500 batches approved in a single 1-hour window |
| Peak PDF Generation Throughput | 30,000 certificates generated in 1 hour (~8.3 PDFs/sec) |
| Peak WhatsApp Delivery Throughput | 30,000 notifications dispatched with rate-limited backoff |
| Public Verification Traffic | 50,000+ verification queries/day, with bursts up to 500 req/sec |

---

## 2. Production Architecture Diagram

```
                        [ Cloudflare CDN & DDoS Protection ]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
    [ Public Verification ]                       [ Authenticated App ]
  Edge Cache (TTL 60s for valid)                SSL Termination / WAF (ALB)
               │                                             │
               │                                ┌────────────┴────────────┐
               │                                ▼                         ▼
               │                       [ ECS / K8s API (3-10 Pods) ]    [ S3 SPA ]
               │                       Auto-scaled on CPU / Conn Count  Static React
               │                                │
               ├────────────────────────────────┤
               ▼                                ▼
    [ Read Replica DB ]           [ Primary Managed PostgreSQL ]
   (Aurora PG - 2 Replicas)        (Aurora PG - Multi-AZ Primary)
   For Verification & Queries                    │
                                                 │ Enqueues
                                                 ▼
                                     [ Redis Cluster (ElastiCache) ]
                                      BullMQ Queues with Persistence
                                                 │
                                                 ▼
                                  [ ECS / K8s Worker Pool (5-20 Pods) ]
                                   Auto-scaled on Queue Depth (Backlog)
                                                 │
                                ┌────────────────┴────────────────┐
                                ▼                                 ▼
                     [ S3 Encrypted Storage ]         [ WhatsApp Cloud API / Provider ]
                     AES-256 for Certificate PDFs     Simulated with Exponential Backoff
```

---

## 3. Cloud Hosting & Service Selection

| Layer | Recommended Service | Justification |
|---|---|---|
| **Frontend SPA** | AWS S3 + CloudFront | High cache hit ratio, global low-latency CDN, zero server maintenance. |
| **Backend API** | AWS ECS (Fargate) / EKS | Auto-scaling stateless Node.js containers behind an Application Load Balancer. |
| **Worker Cluster** | AWS ECS / EKS (Separate cluster) | Decoupled compute scaling; worker memory spikes (PDFKit) never starve API response loops. |
| **Primary Database** | AWS Aurora PostgreSQL (Multi-AZ) | ACID compliance, read-replica auto-scaling, point-in-time recovery, automatic failover. |
| **Job Queue / Cache** | AWS ElastiCache for Redis (Cluster mode) | In-memory queue storage with multi-AZ failover and daily automated snapshots. |
| **Certificate Storage** | AWS S3 Standard (Tiered to Glacier) | 99.999999999% durability, presigned URLs for candidate downloads, KMS encryption. |

---

## 4. Horizontal Scaling Strategy

### API Layer
- **Scaling Metric**: Average CPU utilization > 70% or Target Response Time > 250ms.
- **Min/Max Replicas**: 3 minimum (across 3 Availability Zones) to 15 maximum.
- **Stateless Design**: JWT-based session verification with Redis blacklisting for revoking access. Socket.IO scales across nodes using `@socket.io/redis-adapter`.

### Database Capacity & Optimization
- **Connection Pooling**: AWS RDS Proxy sitting between API/Worker pods and PostgreSQL to pool database connections and avoid connection exhaustion (max 2,000 pooled connections).
- **Read/Write Splitting**:
  - Write queries (Batch creations, approvals, state transitions) target the **Primary Writer**.
  - High-traffic public verification (`/api/verify/:certNumber`) queries target **Read Replicas** with indexed `certificateNumber` lookups ($O(1)$ B-tree index).
- **Table Partitioning**: `AuditLog` table partitioned by month (`createdAt`) to maintain index efficiency as log rows grow into tens of millions.

---

## 5. Queue Management & Worker Scaling

### BullMQ Queue Configuration
- `certificate-queue`: High CPU, low network I/O.
- `notification-queue`: Low CPU, high network I/O (subject to WhatsApp rate limits).
- `escalation-queue`: Cron scheduled job evaluating delayed batches every hour.

### Dynamic Worker Scaling on Backlog
- Workers scale using **KEDA (Kubernetes Event-driven Autoscaling)** based on queue depth:
  $$\text{Target Pods} = \max\left(5, \left\lceil \frac{\text{Queue Depth}}{1500} \right\rceil\right)$$
- During a peak 500-batch approval spike (30,000 candidates), worker pods auto-scale from 5 to 20 within 90 seconds.
- 20 pods generating 2 PDFs/second per pod clear the 30,000 PDF backlog in **12.5 minutes**.

---

## 6. Resilience & Failure Recovery

### Worker Crash Recovery
- BullMQ utilizes atomic Redis lock renewal (`lockDuration: 30000`). If a worker container crashes mid-PDF generation:
  1. The lock expires.
  2. The job is marked stalled and moved back to `waiting`.
  3. A healthy worker reclaims the job.
  4. Idempotency check: Before rendering, the worker verifies if `pdfPath` already exists on S3. If yes, it skips re-rendering and advances to the notification queue.

### Redis Restart Handling
- ElastiCache Redis configured with **AOF (Append-Only File)** persistence and **RDB snapshots**.
- If a primary node fails, automatic failover promotes a replica in under 15 seconds without losing queue state.
- In-flight jobs whose locks expire during failover are reclaimed cleanly via BullMQ's stalled job recovery.

### WhatsApp Outage & Exponential Backoff
- WhatsApp delivery is decoupled from certificate generation. A failure to send WhatsApp **never rolls back or cancels certificate creation**.
- Failed notification attempts use **exponential backoff with jitter**:
  $$t_{\text{retry}} = 2^{\text{attempt}} \times 1000\text{ ms} + \text{random}(0, 500\text{ ms})$$
- Maximum 5 attempts over 24 hours. If all 5 fail, notification state is marked `FAILED` with retry button available in the State Office dashboard.

### Slow Database Handling
- Database queries use strict timeouts (`statement_timeout = 3000ms`).
- Public verification endpoint caches valid responses in Redis for 60 seconds (`cert:cache:{certNumber}`). If the database experiences transient latency, cached public lookups continue responding in < 5ms.
- When a certificate is cancelled, the cache key is purged atomically (`redis.del`).

---

## 7. Certificate Storage & Access Control

- **Storage Location**: S3 bucket with private ACLs (`s3://certiflow-production-certificates/`).
- **Encryption**: AWS KMS server-side encryption with customer-managed keys (SSE-KMS).
- **Access Protocol**:
  - Certificates are never exposed via direct public URLs.
  - Candidates and training centres receive a time-limited **pre-signed S3 download URL** (valid for 15 minutes).
  - Public verification displays metadata only (Name, Course, Centre, District, Date) and never provides raw database IDs, phone numbers, or emails.

---

## 8. Monitoring, Alerting & Observability

- **Metrics Collection**: Prometheus scraping Node.js metrics (event loop lag, heap usage) and BullMQ queue metrics (waiting, active, completed, failed).
- **Dashboards**: Grafana displaying API latency (p50, p95, p99), queue throughput, and worker CPU load.
- **Alert Rules**:
  - `QueueBacklogHigh`: > 5,000 jobs waiting for > 10 minutes → PagerDuty alert.
  - `HighErrorRate`: > 2% HTTP 5xx over 5 minutes → PagerDuty alert.
  - `DatabaseReplicationLag`: Replica lag > 5 seconds → Slack DevOps alert.
- **Audit Tamper Detection**: Periodic cron computes SHA-256 hash chains over `AuditLog` rows to guarantee chronological immutability.

---

## 9. Estimated Monthly Infrastructure Cost

| Component | Specification | Estimated Cost (USD/mo) |
|---|---|---|
| AWS Aurora PostgreSQL | db.r6g.xlarge (Multi-AZ Primary + 1 Read Replica) | $780 |
| AWS ElastiCache Redis | cache.m6g.large (Cluster mode, 2 shards) | $260 |
| AWS ECS Fargate (API) | 4-10 Tasks (2 vCPU, 4GB RAM) | $320 |
| AWS ECS Fargate (Workers)| 5-20 Tasks (2 vCPU, 4GB RAM, auto-scaled) | $450 |
| CloudFront + Route53 | CDN bandwidth (1 TB) + DNS queries | $95 |
| AWS S3 & KMS | 500 GB certificate PDFs + KMS key operations | $45 |
| Monitoring & Logs | CloudWatch Logs + Grafana Cloud | $120 |
| **Total Estimated Cost**| **High-availability scalable deployment** | **~$2,070 / month** |

---

## 10. Key Architectural Trade-offs

1. **Modular Monolith vs. Microservices**:
   - *Choice*: Modular monolith for API with standalone worker process sharing the same data model.
   - *Trade-off*: Avoids distributed transaction overhead (Saga complexity, two-phase commits) while maintaining independent horizontal autoscaling for heavy batch jobs.

2. **BullMQ + Redis vs. RabbitMQ / Kafka**:
   - *Choice*: Redis + BullMQ.
   - *Trade-off*: Lower operational overhead and native support for delayed jobs and exponential backoff, perfectly matched to PDF generation bursts and WhatsApp rate-limiting.

3. **Atomic Batch Validation vs. Partial Acceptance**:
   - *Choice*: Atomic rejection if even one row is invalid.
   - *Trade-off*: Training centres must correct errors and re-upload, but guarantees 100% data consistency and eliminates ambiguous partial batch states.
