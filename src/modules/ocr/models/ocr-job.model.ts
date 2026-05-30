import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';

export type FileStorage = 'local' | 'minio';

@Entity('ocr_jobs')
export class OcrJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_type', type: 'varchar', length: 100 })
  jobType!: OcrProcessorEnum;

  @Column({ name: 'job_status', type: 'varchar', length: 50 })
  jobStatus!: OcrJobStatus;

  @Column({ name: 'requested_by', type: 'varchar', length: 255, nullable: true })
  requestedBy!: string | null;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'file_storage', type: 'varchar', length: 20 })
  fileStorage!: FileStorage;

  @Column({ name: 'requested_on', type: 'timestamptz', default: () => 'NOW()' })
  requestedOn!: Date;

  @Column({ name: 'completed_on', type: 'timestamptz', nullable: true })
  completedOn!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'job_meta', type: 'jsonb', default: {} })
  jobMeta!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;
}
