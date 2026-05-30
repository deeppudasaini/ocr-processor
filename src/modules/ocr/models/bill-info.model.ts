import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BillItem } from './bill-item.model';

@Entity('bill_infos')
export class BillInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ name: 'merchant_name', type: 'varchar', length: 255, nullable: true })
  merchantName!: string | null;

  @Column({ name: 'merchant_address', type: 'text', nullable: true })
  merchantAddress!: string | null;

  @Column({ name: 'bill_date', type: 'date', nullable: true })
  billDate!: string | null;

  @Column({ name: 'bill_date_bs', type: 'text', nullable: true })
  billDateBs!: string | null;

  @Column({ name: 'bill_time', type: 'time', nullable: true })
  billTime!: string | null;

  @Column({ name: 'currency', type: 'varchar', length: 10, nullable: true })
  currency!: string | null;

  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  subtotalAmount!: number | null;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  taxAmount!: number | null;

  @Column({ name: 'service_charge', type: 'numeric', precision: 18, scale: 2, nullable: true })
  serviceCharge!: number | null;

  @Column({ name: 'tip_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  tipAmount!: number | null;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  discountAmount!: number | null;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  totalAmount!: number | null;

  @Column({name:'bill_format', type: 'text', nullable: true})
  billFormat!: string | null;

  @Column({ name: 'udf1', type: 'text', nullable: true })
  udf1!: string | null;

  @Column({ name: 'udf2', type: 'text', nullable: true })
  udf2!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;


  @OneToMany(() => BillItem, (item) => item.billInfo, { cascade: true, eager: true })
  items!: BillItem[];
}
