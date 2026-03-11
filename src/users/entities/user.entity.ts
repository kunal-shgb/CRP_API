import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { RegionalOffice } from '../../regional-offices/entities/regional-office.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProductType } from '../../common/enums/product-type.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BRANCH })
  role: UserRole;

  @OneToOne(() => Branch, (branch) => branch.id, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @OneToOne(() => RegionalOffice, (ro) => ro.id, { nullable: true })
  @JoinColumn({ name: 'ro_id' })
  ro: RegionalOffice;

  @Column({ type: 'enum', enum: ProductType, nullable: true })
  product_type: ProductType;
}
