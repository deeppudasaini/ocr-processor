import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOcrTables1748563800000 implements MigrationInterface {
  name = 'CreateOcrTables1748563800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── ocr_jobs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ocr_jobs" (
        "id"            UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "job_type"      VARCHAR(100)  NOT NULL,
        "job_status"    VARCHAR(50)   NOT NULL,
        "requested_by"  VARCHAR(255),
        "file_path"     TEXT          NOT NULL,
        "file_storage"  VARCHAR(20)   NOT NULL,
        "requested_on"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "completed_on"  TIMESTAMPTZ,
        "error_message" TEXT,
        "job_meta"      JSONB         NOT NULL DEFAULT '{}',
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ            DEFAULT NOW(),
        CONSTRAINT "PK_ocr_jobs" PRIMARY KEY ("id")
      )
    `);

    // ─── api_logs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_logs" (
        "id"               UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "url"              TEXT         NOT NULL,
        "request_payload"  JSONB,
        "response_payload" JSONB,
        "requested_on"     TIMESTAMPTZ  NOT NULL,
        "response_on"      TIMESTAMPTZ,
        "status"           VARCHAR(50),
        "owner_type"       VARCHAR(100) NOT NULL,
        "owner_id"         UUID         NOT NULL,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_api_logs" PRIMARY KEY ("id")
      )
    `);

    // ─── bill_infos ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_infos" (
        "id"               UUID           NOT NULL DEFAULT uuid_generate_v4(),
        "job_id"           UUID           NOT NULL,
        "merchant_name"    VARCHAR(255),
        "merchant_address" TEXT,
        "bill_date"        DATE,
        "bill_time"        TIME,
        "currency"         VARCHAR(10),
        "subtotal_amount"  NUMERIC(18,2),
        "tax_amount"       NUMERIC(18,2),
        "service_charge"   NUMERIC(18,2),
        "tip_amount"       NUMERIC(18,2),
        "discount_amount"  NUMERIC(18,2),
        "total_amount"     NUMERIC(18,2),
        "udf1"             TEXT,
        "udf2"             TEXT,
        "created_at"       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_bill_infos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bill_infos_job_id" FOREIGN KEY ("job_id")
          REFERENCES "ocr_jobs"("id") ON DELETE CASCADE
      )
    `);

    // ─── bill_items ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_items" (
        "id"          UUID           NOT NULL DEFAULT uuid_generate_v4(),
        "bill_id"     UUID           NOT NULL,
        "item_name"   VARCHAR(500),
        "quantity"    NUMERIC(18,2),
        "unit_price"  NUMERIC(18,2),
        "total_price" NUMERIC(18,2),
        "udf1"        TEXT,
        "udf2"        TEXT,
        "created_at"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_bill_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bill_items_bill_id" FOREIGN KEY ("bill_id")
          REFERENCES "bill_infos"("id") ON DELETE CASCADE
      )
    `);

    // ─── Indexes ──────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ocr_jobs_job_status" ON "ocr_jobs" ("job_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ocr_jobs_requested_by" ON "ocr_jobs" ("requested_by")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_api_logs_owner" ON "api_logs" ("owner_type", "owner_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_infos_job_id" ON "bill_infos" ("job_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_items_bill_id" ON "bill_items" ("bill_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bill_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bill_infos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ocr_jobs"`);
  }
}
