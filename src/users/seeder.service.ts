import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
  ) {}

  async onApplicationBootstrap() {
    // 1. Seed Admin
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

    // // 2. Bulk create branch users if missing
    // console.log('Starting bulk branch user creation check...');
    // const result = await this.usersService.bulkCreateBranchUsers();
    // console.log(`Branch users check completed: ${result.created} created, ${result.skipped} skipped.`);
  }
}
