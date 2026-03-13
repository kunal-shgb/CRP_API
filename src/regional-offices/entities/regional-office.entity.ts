import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('regional_offices')
export class RegionalOffice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @OneToMany(() => Branch, (branch) => branch.regionalOffice, { cascade: true, onDelete: 'CASCADE' })
  branches: Branch[];

  @OneToMany(() => User, (user) => user.regionalOffice, { cascade: true, onDelete: 'CASCADE' })
  users: User[];

  @OneToMany(() => Ticket, (ticket) => ticket.assigned_regionalOffice)
  tickets: Ticket[];
}
