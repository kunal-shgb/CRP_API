import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { BranchesService } from '../branches/branches.service';
import { RegionalOfficesService } from '../regional-offices/regional-offices.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private branchesService: BranchesService,
    private roService: RegionalOfficesService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.findByUsername(createUserDto.username);
    if (existing) {
      throw new ConflictException(`User with username ${createUserDto.username} already exists`);
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      username: createUserDto.username,
      password: hashedPassword,
      role: createUserDto.role,
      product_type: createUserDto.productType,
    });

    if (createUserDto.role === UserRole.BRANCH && createUserDto.branchId) {
      const existingBranchUser = await this.usersRepository.findOne({
        where: { branch: { id: createUserDto.branchId } }
      });
      if (existingBranchUser) {
        throw new ConflictException('Only one user can be created for this Branch/REGIONAL_OFFICE.');
      }
      const branch = await this.branchesService.findOne(createUserDto.branchId);
      if (!branch) throw new NotFoundException('Branch not found');
      user.branch = branch;
    }

    if (createUserDto.role === UserRole.REGIONAL_OFFICE && createUserDto.roId) {
      const existingROUser = await this.usersRepository.findOne({
        where: { regionalOffice: { id: createUserDto.roId } }
      });
      if (existingROUser) {
        throw new ConflictException('Only one user can be created for this Branch/REGIONAL_OFFICE.');
      }
      const regionalOffice = await this.roService.findOne(createUserDto.roId);
      if (!regionalOffice) throw new NotFoundException('Regional Office not found');
      user.regionalOffice = regionalOffice;
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['branch', 'regionalOffice'] });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['branch', 'regionalOffice'] });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['branch', 'regionalOffice']
    });
  }
}
