import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { RegionalOffice } from '../../regional-offices/entities/regional-office.entity';
import { QrCodeStatus } from '../../common/enums/qr-code-status.enum';

@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  merchant_name: string;

  @Column({ length: 10 })
  mobile_number: string;

  @Column()
  account_number: string;

  @Column()
  ifsc_code: string;

  @Column()
  mcc_code: string;

  @Column({ nullable: true })
  email_id: string;

  @Column()
  transaction_type: string;

  @Column({ type: 'text' })
  address_line1: string;

  @Column({ type: 'text', nullable: true })
  address_line2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column({ nullable: true })
  circle_id: string;

  @Column({ length: 6 })
  pincode: string;

  @Column()
  sol_id: string;

  @Column({ type: 'enum', enum: QrCodeStatus, default: QrCodeStatus.PENDING_QR_GENERATION })
  status: QrCodeStatus;

  @Column({ nullable: true })
  qr_pdf_url: string;

  @Column({ nullable: true })
  qr_pdf_filename: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => RegionalOffice, { nullable: true })
  @JoinColumn({ name: 'regional_office_id' })
  regional_office: RegionalOffice;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
