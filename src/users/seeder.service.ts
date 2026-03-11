import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('admin123', salt);
      const admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
      });
      await this.userRepository.save(admin);
      console.log('Default admin user created: admin / admin123');
    }
  }
}
