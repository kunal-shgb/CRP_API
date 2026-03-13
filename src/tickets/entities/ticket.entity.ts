import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RegionalOffice } from '../../regional-offices/entities/regional-office.entity';
import { ProductType } from '../../common/enums/product-type.enum';
import { TicketType } from '../../common/enums/ticket-type.enum';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { TicketLevel } from '../../common/enums/ticket-level.enum';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  utr_rrn: string;

  @Column()
  account_number: string;

  @Column({ type: 'date', nullable: true })
  transaction_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  transaction_amount: number;

  @Column({ type: 'enum', enum: ProductType })
  product_type: ProductType;

  @Column({ type: 'enum', enum: TicketType })
  ticket_type: TicketType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketLevel, default: TicketLevel.BRANCH })
  current_level: TicketLevel;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @ManyToOne(() => RegionalOffice, (regionalOffice) => regionalOffice.tickets, { nullable: false })
  @JoinColumn({ name: 'assigned_regionalOffice_id' })
  assigned_regionalOffice: RegionalOffice;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments: TicketComment[];

  @OneToMany(() => TicketAttachment, (attachment) => attachment.ticket)
  attachments: TicketAttachment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
