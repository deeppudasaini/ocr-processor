import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillInfo } from './bill-info.model';

@Entity('bill_items')
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bill_id', type: 'uuid' })
  billId!: string;

  @Column({ name: 'item_name', type: 'varchar', length: 500, nullable: true })
  itemName!: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 2, nullable: true })
  quantity!: number | null;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2, nullable: true })
  unitPrice!: number | null;

  @Column({ name: 'total_price', type: 'numeric', precision: 18, scale: 2, nullable: true })
  totalPrice!: number | null;

  @Column({ name: 'udf1', type: 'text', nullable: true })
  udf1!: string | null;

  @Column({ name: 'udf2', type: 'text', nullable: true })
  udf2!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => BillInfo, (info) => info.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  billInfo!: BillInfo;
}
