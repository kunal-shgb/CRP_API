import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { RegionalOffice } from '../../regional-offices/entities/regional-office.entity';
import { User } from '../../users/entities/user.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => RegionalOffice, (regionalOffice) => regionalOffice.branches, { nullable: false })
  @JoinColumn({ name: 'ro_id' })
  regionalOffice: RegionalOffice;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];
}
