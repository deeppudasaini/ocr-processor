# OCR Invoice Extraction System

> A production-ready asynchronous OCR pipeline that extracts structured billing data from invoice images using the Vedas Studios OCR API, built with Node.js, Kafka, Redis, and PostgreSQL.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [External Dependencies](#external-dependencies)
3. [Setup & Installation](#setup--installation)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Running Tests](#running-tests)
7. [System Architecture](#system-architecture)
8. [Architecture Decisions](#architecture-decisions)
9. [API Reference](#api-reference)
10. [Assumptions & Trade-offs](#assumptions--trade-offs)
11. [Known Limitations](#known-limitations)
12. [Project Structure](#project-structure)

---

## Prerequisites

| Tool         | Version    | Notes                                  |
|--------------|------------|----------------------------------------|
| Node.js      | `>= 20.x`  | Required for native `fetch` support    |
| npm          | `>= 10.x`  |                                        |
| PostgreSQL   | `>= 15.x`  | Primary data store                     |
| Redis        | `>= 7.x`   | Job status cache                       |
| Apache Kafka | `>= 3.x`   | Async job queue                        |
| Docker       | Optional   | Recommended for running dependencies   |

---

## External Dependencies

### Redis
**Purpose:** Caches job status at every pipeline transition so the status check endpoint and SSE stream can serve results without hitting PostgreSQL on every request.

- Key pattern: `ocr:job:{jobId}:status`
- TTL: 86400 seconds (24 hours)
- Used by: `CheckOcrJobStatusUseCase`, `StreamOcrJobStatusUseCase`, `OcrProcessorAbstract`

**Installation:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

---

### Apache Kafka
**Purpose:** Decouples invoice upload from OCR processing. The HTTP server publishes a lightweight message to Kafka and returns `HTTP 202` immediately. A separate consumer process picks up the message and runs the heavy OCR pipeline asynchronously.

- Topic: `ocr.processing`
- Consumer Group: `ocr-job-worker-group`
- Message shape: `{ jobId: string, extractor: string }`

**Installation:**
```bash
# Docker Compose (recommended)
docker-compose up -d kafka zookeeper
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
      POSTGRES_DB: ocr_db
```

---

### PostgreSQL
**Purpose:** Primary persistent store for OCR job records (`ocr_jobs`), extracted bill data (`bill_infos`, `bill_items`), and third-party API call audit logs.

**Installation:**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu
sudo apt install postgresql-15
sudo systemctl start postgresql

# Docker (included in docker-compose.yml above)
```

---

### MinIO (Optional — Production Only)
**Purpose:** S3-compatible object storage for uploaded invoice images. Local filesystem is used in development. The storage backend is swapped via the `STORAGE_TYPE` environment variable with no code changes.

```bash
# Docker
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  --name minio \
  minio/minio server /data --console-address ":9001"
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ocr-extraction
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your local values
```

### 4. Start infrastructure dependencies

```bash
docker-compose up -d
```

### 5. Run database migrations

```bash
npm run migration:run
```

### 6. Create Kafka topic

```bash
docker exec -it <kafka-container-id> \
  kafka-topics --create \
  --topic ocr.processing \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1
```

### 7. Build the project

```bash
npm run build
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://appuser:apppassword@localhost:5432/ocr_db

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=invoice-processing-api
OCR_KAFKA_TOPIC=ocr.processing

# Storage — 'local' uses project filesystem, 'minio' uses MinIO/S3
STORAGE_TYPE=local

# MinIO (only required if STORAGE_TYPE=minio)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ocr-uploads

# OCR Provider
VEDAS_OCR_API_URL=https://pos-ocr.vedastudios.com.np/api/v1/extract
```

---

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage
```

> **Note:** Integration tests require a live PostgreSQL instance. Set `DATABASE_URL` to a dedicated test database before running them. Redis is mocked in all tests via `jest.mock`.

---

## System Architecture

### High-Level Flow

```
Client
  │
  ▼
Express HTTP Server  (:3000)
  │
  ├── POST /api/v1/ocr/process
  │     │
  │     ├── 1. Upload file to storage (Local FS or MinIO)
  │     ├── 2. Create OcrJob record in PostgreSQL
  │     ├── 3. Set Redis cache: ocr:job:{id}:status = PENDING
  │     ├── 4. Publish to Kafka topic: ocr.processing
  │     └── 5. Return HTTP 202 { jobId }
  │
  ├── GET /api/v1/ocr/jobs/:jobId
  │     └── Redis cache → PostgreSQL fallback
  │
  └── GET /api/v1/ocr/jobs/:jobId/stream  (SSE)
        └── Poll Redis every 2s → push status events to client
              │
              ▼
         Kafka Topic: ocr.processing
              │
              ▼
         OcrJobConsumer (KafkaJS)
              │
              ▼
         OcrProcessorRegistry
              │
              ▼
         VedasOcrProcessorServiceImpl
              │
              ├── FETCHING_FILE      → Local FS / MinIO
              ├── EXTRACTING_TEXT    → POST to Vedas OCR API (Axios)
              ├── TRANSFORMING_DATA  → Normalize + map fields
              ├── SAVING_DATA        → Persist BillInfo to PostgreSQL
              └── COMPLETED          → Update DB + Redis
```

### Job Status Lifecycle

Every stage of processing updates both PostgreSQL and Redis atomically:

```
PENDING
  └── PROCESSING_STARTED
        └── FETCHING_FILE
              └── EXTRACTING_TEXT
                    └── TRANSFORMING_DATA
                          └── SAVING_DATA
                                └── COMPLETED

  (any stage can transition to) → FAILED
```

### Database Schema

**`ocr_jobs`** — tracks every submitted invoice job

| Column          | Type        | Description                              |
|-----------------|-------------|------------------------------------------|
| `id`            | uuid        | Primary key                              |
| `job_type`      | varchar     | OCR processor identifier                 |
| `job_status`    | varchar     | Current pipeline status                  |
| `file_path`     | varchar     | Path or object key in storage            |
| `file_storage`  | varchar     | `local` or `minio`                       |
| `requested_by`  | varchar     | Requesting user or system                |
| `job_meta`      | jsonb       | Original filename and other metadata     |
| `completed_on`  | timestamptz | Set when job reaches COMPLETED           |
| `error_message` | text        | Set when job reaches FAILED              |

**`bill_infos`** — stores extracted invoice header data

| Column             | Type          | Description                             |
|--------------------|---------------|-----------------------------------------|
| `id`               | uuid          | Primary key                             |
| `job_id`           | uuid          | Reference to `ocr_jobs`                 |
| `merchant_name`    | varchar(255)  | Extracted merchant name                 |
| `merchant_address` | text          | Extracted merchant address              |
| `bill_date`        | date          | Converted Gregorian date (AD)           |
| `bill_date_bs`     | varchar(20)   | Original Bikram Sambat date string      |
| `bill_time`        | time          | Extracted bill time                     |
| `currency`         | varchar(10)   | Currency symbol or code                 |
| `subtotal_amount`  | numeric(18,2) | Extracted subtotal                      |
| `tax_amount`       | numeric(18,2) | Extracted tax                           |
| `service_charge`   | numeric(18,2) | Extracted service charge                |
| `tip_amount`       | numeric(18,2) | Extracted tip                           |
| `discount_amount`  | numeric(18,2) | Extracted discount                      |
| `total_amount`     | numeric(18,2) | Extracted total                         |

**`bill_items`** — stores individual line items per invoice

| Column        | Type          | Description                                 |
|---------------|---------------|---------------------------------------------|
| `id`          | uuid          | Primary key                                 |
| `bill_id`     | uuid          | Foreign key to `bill_infos` (cascade delete)|
| `item_name`   | varchar(500)  | Line item description                       |
| `quantity`    | numeric(18,2) | Item quantity                               |
| `unit_price`  | numeric(18,2) | Price per unit                              |
| `total_price` | numeric(18,2) | Line total                                  |

---

## Architecture Decisions

### 1. Abstraction Layer for Multiple OCR Providers

One of the core design goals was to support multiple OCR providers without changing any consumer or routing logic. This was achieved through an **abstract processor pattern**.

`OcrProcessorAbstract<TFile, TRawOcrResponse>` is a generic base class that defines the full processing pipeline as a fixed sequence of steps:

```
fetchJob → updateJobStatus → fetchFile → extractText → transformData → saveExtractedData
```

Infrastructure concerns shared across all providers — job fetching, status updates, Redis cache writes, and failure handling — are implemented as **concrete methods** in the abstract class. These never need to change regardless of which OCR provider is used.

Provider-specific logic is defined as **abstract methods** that each implementation must supply:

| Abstract Method        | What the provider implements                     |
|------------------------|--------------------------------------------------|
| `fetchFile()`          | How to retrieve the file (local, S3, etc.)       |
| `extractText()`        | Which OCR API to call and how                    |
| `transformData()`      | How to map the API response to `BillInfo`         |
| `saveExtractedData()`  | How to persist the extracted data                |

A new OCR provider (e.g. Google Vision, AWS Textract) can be added by:

1. Creating a new class that extends `OcrProcessorAbstract`
2. Implementing the four abstract methods specific to that provider
3. Registering it in `OcrProcessorRegistry` with a unique key

```typescript
// Adding a new provider requires zero changes to the consumer or registry logic
ocrProcessorRegistry.registerAbstract(
  OcrProcessorEnum.GOOGLE_VISION,
  new GoogleVisionOcrProcessorServiceImpl()
);
```

The `OcrProcessorRegistry` maintains a `Map<string, OcrProcessing>` and wraps each abstract implementation in an `OcrProcessorAdapter`. The Kafka consumer looks up the correct processor by the `extractor` field in the message — it has no knowledge of any specific provider implementation.

This design follows the **Open/Closed Principle** — the system is open for extension (new providers) but closed for modification (the pipeline orchestration is untouched when adding providers).

---

### 2. Asynchronous Processing via Apache Kafka

**Decision:** The HTTP request returns `HTTP 202 Accepted` immediately. OCR processing happens in a separate Kafka consumer process.

**Why Kafka:**
- OCR processing takes 5–20 seconds per image. A synchronous HTTP approach would hold the connection open, exhaust thread pools under load, and risk gateway timeouts.
- Kafka provides durable message storage — if the consumer crashes mid-processing, the uncommitted offset is redelivered after restart with no message loss.
- The producer and consumer scale independently. Multiple consumer instances process different Kafka partitions in parallel without coordination.
- Kafka's consumer group protocol handles instance rebalancing automatically.

**Kafka consumer configuration decisions:**
- `autoCommit: false` — offsets are committed manually only after successful processing, preventing silent message loss on failure.
- `sessionTimeout: 60000ms` — raised from the default 30s to accommodate long OCR jobs without triggering spurious rebalances.
- `heartbeatInterval: 5000ms` — kept well under `sessionTimeout / 3` as required by Kafka protocol.
- Graceful shutdown via `SIGTERM`/`SIGINT` handlers call `consumer.disconnect()` so the consumer leaves the group cleanly rather than waiting for session expiry.

---

### 3. Real-Time Status Updates via Server-Sent Events (SSE)

**Decision:** SSE over WebSockets for real-time job status streaming.

**Why SSE:**
- Job status updates are strictly **unidirectional** — the server pushes, the client only listens. SSE is purpose-built for this pattern.
- SSE works over plain HTTP/1.1 with no protocol upgrade, making it simpler to implement, proxy, and load-balance than WebSockets.
- The browser `EventSource` API handles automatic reconnection natively with no client-side library required.

**SSE implementation details:**
- `X-Accel-Buffering: no` header prevents nginx from batching events into delayed chunks.
- The stream polls Redis every 2 seconds. Redis is checked first; the database is only queried on cache miss or when a terminal status is reached and full details (`completedOn`, `errorMessage`) are needed.
- A 5-minute safety timeout closes stale connections if the worker dies and no terminal status is ever published.
- `setInterval` is cleared on `res.on('close')` to prevent memory leaks when clients disconnect early.

---

### 4. Upload-First Job Creation

**Decision:** Upload the file to storage before creating the database record.

**Why:**
- The original approach required two database writes per job: `INSERT` with `filePath: 'pending'`, then `UPDATE` with the real path after upload.
- By uploading first, the job is created with the final file path in a single `INSERT`. The `updateFilePath` call is eliminated entirely.
- If the upload fails, no orphaned job record is left in the database with an unresolvable `pending` file path.
- `redisSet` and `producer.publishOcrJob` run in parallel via `Promise.all` since both depend only on `job.id` and are independent of each other.

---

### 5. Response Normalization for Third-Party API Variance

**Decision:** A dedicated `normalizeVedasResponse()` pure function handles all API response shape variance before data reaches the transformation layer.

**Why:**
- The Vedas API returns inconsistent field names across versions (`merchant_name` vs `merchantName`) and may nest data under a `data` envelope.
- Invoices from Nepali merchants return content in Devanagari script. Numeric fields contain Unicode digits (`०–९`, U+0966–U+096F) which `parseFloat()` and PostgreSQL `numeric` columns cannot parse.
- Dates are in Bikram Sambat (BS) format, approximately 56–57 years ahead of Gregorian with irregular month lengths that do not follow any mathematical formula. A lookup-table-based BS-to-AD converter produces a valid Gregorian date for storage.
- Both the original BS string and converted AD date are stored — BS in `bill_date_bs` (varchar) for display, AD in `bill_date` (date) for queries and sorting.
- Isolating all normalization in a single pure function makes it independently testable and keeps `transformData` clean regardless of upstream API changes.

---

### 6. Pluggable Storage Backend

**Decision:** File storage backend is selected at runtime via the `STORAGE_TYPE` environment variable.

**Why:**
- Local filesystem is sufficient for development with no infrastructure required.
- Production deployments use MinIO (S3-compatible) for durability and horizontal scalability.
- Both backends implement the same interface — switching requires only an environment variable change with zero code modifications.

---

### 7. Cache-First Status Reads

**Decision:** Job status is read from Redis first, with PostgreSQL as a fallback.

**Why:**
- During active processing, status changes rapidly through multiple intermediate states. Serving these from Redis avoids repeated DB queries on every SSE poll tick.
- Terminal statuses (`COMPLETED`, `FAILED`) always fall through to the database to return full details (`completedOn`, `errorMessage`) that are not stored in the cache value.
- Every DB read updates the Redis cache, keeping it warm for subsequent requests.

---

## API Reference

### `POST /api/v1/ocr/process`
Upload one or more invoice images for OCR processing.

- **Content-Type:** `multipart/form-data`
- **Field name:** `files` (supports multiple files in one request)
- **Accepted types:** JPEG, JPG, PNG, GIF, WEBP, BMP, TIFF
- **Max file size:** 10MB per file
- **Max files per request:** 10

```bash
curl -X POST http://localhost:3000/api/v1/ocr/process \
  -F "files=@invoice1.jpg" \
  -F "files=@invoice2.png"
```

**Response `HTTP 202`:**
```json
{
  "code": 202,
  "message": "2 job(s) created successfully and queued for extraction.",
  "data": [
    { "jobId": "550e8400-e29b-41d4-a716-446655440000", "message": "Invoice processing job created successfully and queued for extraction." },
    { "jobId": "550e8400-e29b-41d4-a716-446655440001", "message": "Invoice processing job created successfully and queued for extraction." }
  ]
}
```

---

### `GET /api/v1/ocr/jobs/:jobId`
Poll the current status of an OCR job.

**Response `HTTP 200`:**
```json
{
  "code": 200,
  "message": "Status retrieved successfully",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "completedOn": "2024-06-29T10:30:00.000Z",
    "errorMessage": null
  }
}
```

**Possible status values:**

| Status               | Description                              |
|----------------------|------------------------------------------|
| `PENDING`            | Job created, waiting in Kafka queue      |
| `PROCESSING_STARTED` | Consumer picked up the message           |
| `FETCHING_FILE`      | Retrieving image from storage            |
| `EXTRACTING_TEXT`    | Calling the OCR API                      |
| `TRANSFORMING_DATA`  | Normalizing and mapping the response     |
| `SAVING_DATA`        | Persisting extracted data to database    |
| `COMPLETED`          | Successfully processed                   |
| `FAILED`             | Processing failed — see `errorMessage`   |

---

### `GET /api/v1/ocr/jobs/:jobId/stream`
Subscribe to real-time job status updates via Server-Sent Events. Stream closes automatically on terminal status or after 5 minutes.

| Event    | When                                    | Payload                                                |
|----------|-----------------------------------------|--------------------------------------------------------|
| `status` | On connect + every ~2s during polling  | `{ jobId, status, completedOn, errorMessage }`         |
| `done`   | Terminal status reached                 | `{ jobId }`                                            |
| `error`  | Polling error or 5-minute timeout       | `{ jobId, message }`                                   |

```javascript
const es = new EventSource(`/api/v1/ocr/jobs/${jobId}/stream`);
es.addEventListener('status', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('done',   ()  => es.close());
es.addEventListener('error',  (e) => { console.error(e); es.close(); });
```

---

### `DELETE /api/v1/ocr/cleanup`
Deletes locally stored files for all jobs in a terminal status. Files for in-progress jobs are never touched. Safe to call multiple times — already-deleted files are counted as success.

**Response `HTTP 200`:**
```json
{
  "code": 200,
  "message": "Cleanup completed successfully",
  "data": {
    "deletedFiles": ["ocr-uploads/invoice-abc123.jpg"],
    "failedFiles": [],
    "totalDeleted": 1,
    "totalFailed": 0
  }
}
```

---

## Assumptions & Trade-offs

| # | Assumption / Trade-off | Reasoning |
|---|------------------------|-----------|
| 1 | BS dates outside the supported lookup range are stored as `null` | Better to store null than fail the entire job over an edge-case date format |
| 2 | Both the original BS date string and converted AD date are persisted | Preserves source data for display while enabling standard date queries in AD |
| 3 | File cleanup is a manual API call rather than a scheduled job | Avoids accidental deletion of files that may be needed for reprocessing or auditing |
| 4 | `STORAGE_TYPE=local` in development; files written to `ocr-uploads/` in project root | Simplifies local setup with no external object storage required |
| 5 | One Kafka partition per topic in development | Simplifies local setup; production should use multiple partitions for throughput |
| 6 | One message processed at a time per consumer instance | Prevents resource exhaustion from concurrent long-running OCR API calls; horizontal scaling is achieved by running multiple consumer instances |
| 7 | Redis cache TTL of 24 hours | Balances memory usage against the risk of stale status reads for long-lived job IDs |
| 8 | Only Vedas Studios OCR is integrated; the abstraction supports adding more providers | The `OcrProcessorAbstract` pattern makes adding new providers a matter of implementing four methods and one registration call |
| 9 | `requestedBy` is hardcoded to `"SYSTEM"` | Authentication and multi-tenancy are out of scope for this implementation |
| 10 | All Vedas API calls are logged regardless of success or failure | Provides a full audit trail for debugging extraction quality and monitoring API reliability |

---

## Known Limitations

- **No retry mechanism** — Failed OCR jobs must be manually resubmitted. A retry queue with exponential backoff would improve reliability in production.
- **Single OCR provider active** — While the architecture supports multiple providers, only Vedas Studios is integrated.
- **BS date range** — Bikram Sambat dates outside 1970–2100 BS cannot be converted and are stored as `null`.
- **SSE timeout requires client reconnection** — The 5-minute stream timeout requires the client to open a new connection. `Last-Event-ID` support would allow seamless reconnection without missing events.
- **Manual Kafka topic creation** — The topic must exist before first run. Auto-topic creation is disabled by default in production Kafka clusters.
- **No authentication** — All API endpoints are publicly accessible. JWT or API key authentication should be added before production deployment.
- **MinIO bucket must exist** — The bucket is not auto-created on startup when `STORAGE_TYPE=minio`.

---

## Project Structure

```
src/
├── config/
│   ├── env.ts                           # Environment variable parsing
│   └── server.ts                        # CORS and compression config
│
├── infra/
│   ├── cache/
│   │   └── redis.ts                     # ioredis client, get/set helpers
│   ├── database/
│   │   ├── typeorm/
│   │   │   └── data-source.ts           # TypeORM DataSource
│   │   └── migrations/                  # Database migration files
│   ├── http/
│   │   └── httpServer.ts                # Express app factory
│   ├── monitoring/
│   │   └── logger.ts                    # Winston logger
│   ├── queue/
│   │   └── consumers/
│   │       └── base.consumer.ts         # Abstract Kafka consumer
│   └── storage/
│       ├── local/storage.ts             # Local filesystem service
│       └── minio/minio.client.ts        # MinIO/S3 service
│
├── modules/
│   └── ocr/
│       ├── controllers/
│       │   └── ocr.controller.ts        # Route handlers
│       ├── dtos/
│       │   └── create-job.dto.ts        # Request shapes
│       ├── models/
│       │   ├── ocr-job.model.ts         # OcrJob entity
│       │   └── bill-info.model.ts       # BillInfo entity
│       ├── queue/
│       │   ├── ocr-job.producer.ts      # Kafka producer
│       │   └── consumers/
│       │       └── ocr-job.consumer.ts  # Kafka consumer
│       ├── repositories/
│       │   ├── ocr.repository.ts        # OcrJob data access
│       │   └── bill-info.repository.ts  # BillInfo data access
│       ├── routes/
│       │   └── ocr.routes.ts            # Express router
│       ├── types/
│       │   └── ocr.types.ts             # Shared types
│       ├── usecases/
│       │   ├── create-invoice-processing-job.usecase.ts
│       │   ├── check-ocr-job-status.usecase.ts
│       │   ├── stream-ocr-job-status.usecase.ts
│       │   └── cleanup-ocr-uploads.usecase.ts
│       ├── validators/
│       │   └── ocr.validator.ts         # Multer file upload config
│       └── workers/
│           ├── abstracts/
│           │   └── ocr-processor.abstract.ts    # Generic pipeline base class
│           ├── registry/
│           │   └── ocr.registry.ts              # Provider registry + adapter
│           ├── services/
│           │   └── vedas/
│           │       ├── vedas-ocr-processor.service.ts
│           │       └── vedas-response-normalizer.ts
│           └── utils/
│               └── date-converter.ts            # BS to AD conversion
│
└── shared/
    ├── constants/
    │   ├── ocr-job-status.enum.ts
    │   └── ocr-processor.enum.ts
    ├── errors/
    │   └── AppError.ts
    ├── interfaces/
    │   └── index.ts                     # IBaseUseCase
    ├── middlewares/
    │   ├── error/
    │   │   ├── errorHandler.ts
    │   │   └── notFound.ts
    │   ├── asyncHandler.ts
    │   └── sendResponse.ts
    └── utils/
        └── date-converter.ts
```
