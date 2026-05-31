# OCR Invoice Extraction System

> A production-ready asynchronous OCR pipeline that extracts structured billing data from invoice images using the Vedas Studios OCR API, built with Node.js, Kafka, Redis, and PostgreSQL.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
3. [Setup & Installation](#setup--installation)
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
 - Just need docker to run the project


### Requirements
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

That's it. No Node.js, no PostgreSQL, no Redis, no Kafka installation needed.

---

### Steps

**1. Clone the repository**
git clone <repository-url>
cd ocr-extraction

**2. Copy the environment file**
cp .env.example .env

**3. Start everything**
docker-compose up --build

---

### That's it. The following services start automatically:

| Service    | URL / Port                  | Credentials                        |
|------------|-----------------------------|------------------------------------|
| API        | http://localhost:3000       |                                    |
| MinIO UI   | http://localhost:9001       | minioadmin / minioadmin            |
| PostgreSQL | localhost:5432              | appuser / AppUser@2025@            |
| Redis      | localhost:6379              | password: Redis123                 |
| Kafka      | localhost:29092             |                                    |

---

### The following are set up automatically on first run:
- ✅ Database tables created from `scripts/ddl.sql`
- ✅ Kafka topic `ocr.processing` created
- ✅ MinIO bucket `uploads` created

---

### Verify the app is running
curl http://localhost:3000/api/v1/health

---

### Stop the application
docker-compose down

### Stop and remove all data (full reset)
docker-compose down -v
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
docker-compose up --build
```


## Running the Application

### Development

```bash
npm run build
npm run dev
```

## System Architecture

### Database Schema Design
# bill_infos

| Column Name      | Data Type | Remarks                                                                                                                                  |
|------------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------|
| id               | uuid | Primary key of the bill record.                                                                                                          |
| job_id           | uuid | References the OCR job that generated this bill data. Used to link extracted bill information with the processing job.                   |
| merchant_name    | varchar(255) | Name of the merchant/vendor from the bill.                                                                                               |
| merchant_address | text | Address of the merchant extracted from the bill.                                                                                         |
| bill_date        | date | Date printed on the bill.                                                                                                                |
| bill_time        | time | Time printed on the bill.                                                                                                                |
| currency         | varchar(10) | Currency code of the bill amount (e.g., USD, NPR, EUR).                                                                                  |
| subtotal_amount  | numeric(18,2) | Total amount before taxes, service charges, discounts, etc.                                                                              |
| tax_amount       | numeric(18,2) | Tax amount charged on the bill.                                                                                                          |
| service_charge   | numeric(18,2) | Service charge applied to the bill.                                                                                                      |
| tip_amount       | numeric(18,2) | Tip or gratuity amount.                                                                                                                  |
| discount_amount  | numeric(18,2) | Discount deducted from the bill.                                                                                                         |
| total_amount     | numeric(18,2) | Final payable amount after all additions and deductions.                                                                                 |
| udf1             | text | User-defined/custom field for future extensions.                                                     |
| udf2             | text | User-defined/custom field for future extensions.                                                                                         |
| bill_format      | text | Identified bill template or format type used during OCR processing. seperates different kind of invoice. (eg. DEVNAGARI, ENGLISH, OTHERS) |
| bill_date_bs     | text | stores dates that are devnagari specific.                                                                                                |

| created_at | timestamp with time zone | Timestamp when the bill record was created. |

---

# bill_items

| Column Name | Data Type | Remarks |
|------------|-----------|----------|
| id | uuid | Primary key of the bill item record. |
| bill_id | uuid | Foreign key referencing `bill_infos.id`. Associates item with a specific bill. |
| item_name | varchar(500) | Name/description of the purchased item. |
| quantity | numeric(18,2) | Quantity of the item purchased. |
| unit_price | numeric(18,2) | Price per unit of the item. |
| total_price | numeric(18,2) | Total price for the item (`quantity × unit_price`). |
| udf1 | text | User-defined/custom field for additional item metadata. |
| udf2 | text | User-defined/custom field for additional item metadata. |
| created_at | timestamp with time zone | Timestamp when the item record was created. |

---

# ocr_jobs

| Column Name | Data Type | Remarks                                                                                                           |
|------------|-----------|-------------------------------------------------------------------------------------------------------------------|
| id | uuid | Primary key of the OCR job.                                                                                       |
| job_type | varchar(100) | Type of job according to ocr extractor (e.g., VEDAS_STUDIO_EXTRACTOR, OWN, others).                               |
| job_status | varchar(50) | Current processing status (Pending, Processing, Completed, Failed, etc.).                                         |
| requested_by | varchar(255) | User, system, or service that initiated the OCR request.                                                          |
| file_path | text | Storage path or location of the uploaded file.                                                                    |
| file_storage | varchar(20) | Storage provider/type (e.g., Local, S3, MinIO, Azure Blob).                                                       |
| requested_on | timestamp with time zone | Timestamp when OCR processing was requested.                                                                      |
| completed_on | timestamp with time zone | Timestamp when OCR processing completed.                                                                          |
| error_message | text | Error details if OCR processing failed.                                                                           |
| job_meta | jsonb | Additional metadata related to the OCR job, stored as JSON. Original filenames and other metadata are stored here |
| created_at | timestamp with time zone | Record creation timestamp.                                                                                        |
| updated_at | timestamp with time zone | Last update timestamp.                                                                                            |

---

# api_logs

| Column Name | Data Type | Remarks                                                                     |
|------------|-----------|-----------------------------------------------------------------------------|
| id | uuid | Primary key of the API log record.                                          |
| url | text | API endpoint URL that was invoked.                                          |
| request_payload | jsonb | Complete request body sent to the API. Useful for debugging and auditing.   |
| response_payload | jsonb | Response body returned by the API.                                          |
| requested_on | timestamp with time zone | Timestamp when the API request was received.                                |
| response_on | timestamp with time zone | Timestamp when the API response was returned.                               |
| status | varchar(50) | API execution status (Success, Failed, Error, Timeout, etc.).               |
| owner_type | varchar(100) | Entity type associated with the API call (e.g., OCR_JOB, BILL, SYSTEM).     |
| owner_id | uuid | Identifier of the associated entity record. (Eg: Job Id for owner type Job) |
| created_at | timestamp with time zone | Timestamp when the log entry was created.                                   |

---

# Relationships

| Parent Table | Child Table | Relationship | Description |
|-------------|------------|-------------|-------------|
| ocr_jobs.id | bill_infos.job_id | One-to-Many | One OCR job can produce one or more extracted bill records. |
| bill_infos.id | bill_items.bill_id | One-to-Many | One bill can contain multiple line items/products. |
| api_logs.owner_id | Various Entities | Polymorphic | API logs can be associated with OCR jobs, bills, or other entities based on `owner_type`. |


#### Entity Relationship Diagram
<img src="./docs/ERD.png" alt="Entity Relationship Diagram" width="800"/>

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

### `POST /api/v1/ocr/upload`
Upload one or more invoice images for OCR processing.

- **Content-Type:** `multipart/form-data`
- **Field name:** `files` (supports multiple files in one request)
- **Accepted types:** JPEG, JPG, PNG
- **Max file size:** 10MB per file
- **Max files per request:** 5 files. (At Max only 6 sse conection per browser is only possible. Thats why I chose to set the max file upload to 5. If more than 5 files are uploaded, the request will be rejected with a `HTTP 400` response.)

```bash
curl -X POST http://localhost:3000/api/v1/ocr/upload \
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
Poll the current status of an OCR job. This api can be used to poll/check job status in case of SSE connection is disconnected.

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

| Event    | When                                  | Payload                                                |
|----------|---------------------------------------|--------------------------------------------------------|
| `status` | On connect + every ~2s during polling | `{ jobId, status, completedOn, errorMessage }`         |
| `done`   | Terminal status reached               | `{ jobId }`                                            |
| `error`  | Polling error or 3-minute timeout     | `{ jobId, message }`                                   |

```javascript
const es = new EventSource(`/api/v1/ocr/jobs/${jobId}/stream`);
es.addEventListener('status', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('done',   ()  => es.close());
es.addEventListener('error',  (e) => { console.error(e); es.close(); });
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
- **SSE timeout requires client reconnection** — The -minute stream timeout requires the client to open a new connection. `Last-Event-ID` support would allow seamless reconnection without missing events.
- **MinIO bucket must exist** — The bucket is not auto-created on startup when `STORAGE_TYPE=minio`.
- **Kafka Commit Management** — Currently, system is relying more on kafka to commit the logs. Auto commit can be removed and can be commited from the application and Dead letter Queue can be introduced to restore and replay every lost messages or those messages that throws issues. It will make easier to implement retry merchanism.
- ** Redis Pub Sub** - Redis PubSub can be used to publish the status of the job instead of polling the redis every 2 second. It will reduce the number of request to redis and it will be more efficient way to get the real time status of the job.
---
