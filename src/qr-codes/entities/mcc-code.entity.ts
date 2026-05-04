import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mcc_codes')
export class MccCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  mcc_code: string;

  @Column()
  mcc_name: string;
}
