import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
    private regionalOfficeService: RegionalOfficesService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.findByUsername(createUserDto.username);
    if (existing) {
      throw new ConflictException(`User with username ${createUserDto.username} already exists`);
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    if (createUserDto.role !== UserRole.ADMIN && !createUserDto.email) {
      throw new ConflictException('Email is mandatory for this user role.');
    }

    const user = this.usersRepository.create({
      username: createUserDto.username,
      password: hashedPassword,
      role: createUserDto.role,
      productType: createUserDto.productType,
      email: createUserDto.email,
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

    if (createUserDto.role === UserRole.REGIONAL_OFFICE && createUserDto.regionalOfficeId) {
      const existingROUser = await this.usersRepository.findOne({
        where: { regionalOffice: { id: createUserDto.regionalOfficeId } }
      });
      if (existingROUser) {
        throw new ConflictException('Only one user can be created for this Branch/REGIONAL_OFFICE.');
      }
      const regionalOffice = await this.regionalOfficeService.findOne(createUserDto.regionalOfficeId);
      if (!regionalOffice) throw new NotFoundException('Regional Office not found');
      user.regionalOffice = regionalOffice;
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['branch', 'regionalOffice', 'branch.regionalOffice'] });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['branch', 'regionalOffice', 'branch.regionalOffice'] });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['branch', 'regionalOffice', 'branch.regionalOffice']
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id }, relations: ['branch', 'regionalOffice'] });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.findByUsername(updateUserDto.username);
      if (existingUsername) {
        throw new ConflictException(`User with username ${updateUserDto.username} already exists`);
      }
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    if (updateUserDto.role === UserRole.BRANCH && updateUserDto.branchId) {
      if (!user.branch || user.branch.id !== updateUserDto.branchId) {
        const existingBranchUser = await this.usersRepository.findOne({
          where: { branch: { id: updateUserDto.branchId } }
        });
        if (existingBranchUser) {
          throw new ConflictException('Only one user can be created for this Branch.');
        }
        const branch = await this.branchesService.findOne(updateUserDto.branchId);
        if (!branch) throw new NotFoundException('Branch not found');
        user.branch = branch;
      }
    }

    if (updateUserDto.role === UserRole.REGIONAL_OFFICE && updateUserDto.regionalOfficeId) {
       if (!user.regionalOffice || user.regionalOffice.id !== updateUserDto.regionalOfficeId) {
         const existingROUser = await this.usersRepository.findOne({
           where: { regionalOffice: { id: updateUserDto.regionalOfficeId } }
         });
         if (existingROUser) {
           throw new ConflictException('Only one user can be created for this Regional Office.');
         }
         const regionalOffice = await this.regionalOfficeService.findOne(updateUserDto.regionalOfficeId);
         if (!regionalOffice) throw new NotFoundException('Regional Office not found');
         user.regionalOffice = regionalOffice;
       }
    }

    const { branchId, regionalOfficeId, ...updateData } = updateUserDto;
    
    Object.assign(user, updateData);
    
    // Validate role/email requirement
    if (user.role !== UserRole.ADMIN && !user.email) {
      throw new ConflictException('Email is mandatory for this user role.');
    }

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
