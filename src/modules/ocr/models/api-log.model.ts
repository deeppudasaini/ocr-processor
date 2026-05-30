import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_logs')
export class ApiLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'url', type: 'text' })
  url!: string;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload!: Record<string, unknown> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload!: Record<string, unknown> | null;

  @Column({ name: 'requested_on', type: 'timestamptz' })
  requestedOn!: Date;

  @Column({ name: 'response_on', type: 'timestamptz', nullable: true })
  responseOn!: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status!: string | null;

  @Column({ name: 'owner_type', type: 'varchar', length: 100 })
  ownerType!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
