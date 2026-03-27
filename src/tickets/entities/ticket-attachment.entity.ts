import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';
import { TicketComment } from './ticket-comment.entity';

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ManyToOne(() => TicketComment, (comment) => comment.attachments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: TicketComment;

  @Column()
  file_url: string;

  @Column()
  file_name: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by: User;

  @CreateDateColumn()
  created_at: Date;
}
