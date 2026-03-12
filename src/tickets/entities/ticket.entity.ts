import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RegionalOffice } from '../../regional-offices/entities/regional-office.entity';
import { ProductType } from '../../common/enums/product-type.enum';
import { IssueType } from '../../common/enums/issue-type.enum';
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

  @Column({ type: 'enum', enum: ProductType })
  product_type: ProductType;

  @Column({ type: 'enum', enum: IssueType })
  issue_type: IssueType;

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
  @JoinColumn({ name: 'assigned_ro_id' })
  assigned_ro: RegionalOffice;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments: TicketComment[];

  @OneToMany(() => TicketAttachment, (attachment) => attachment.ticket)
  attachments: TicketAttachment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
