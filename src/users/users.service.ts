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
import { TicketAttachment } from '../tickets/entities/ticket-attachment.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TicketAttachment)
    private attachmentRepo: Repository<TicketAttachment>,
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

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<any> {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    
    const query = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.branch', 'branch')
      .leftJoinAndSelect('user.regionalOffice', 'regionalOffice')
      .leftJoinAndSelect('branch.regionalOffice', 'branchRO');

    if (search) {
      query.andWhere('LOWER(user.username) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('user.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
  }

  async findAllByRole(currentUser: any, page: number = 1, limit: number = 10, search?: string): Promise<any> {
    if (currentUser.role === UserRole.ADMIN) {
      return this.findAll(page, limit, search);
    }
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);

    const query = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.branch', 'branch')
      .leftJoinAndSelect('user.regionalOffice', 'regionalOffice')
      .leftJoinAndSelect('branch.regionalOffice', 'branchRO');

    if (currentUser.role === UserRole.REGIONAL_OFFICE && currentUser.regionalOffice?.id) {
      query.andWhere(
        '(branchRO.id = :roId OR regionalOffice.id = :roId)',
        { roId: currentUser.regionalOffice.id }
      );
    } else {
      return { data: [], meta: { totalRecords: 0, page, limit, totalPages: 0 } };
    }

    if (search) {
      query.andWhere('LOWER(user.username) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('user.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
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

  async bulkCreateBranchUsers(): Promise<any> {
    const branches = await this.branchesService.findAllEntities();
    const results: any[] = [];
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('123456', salt);

    for (const branch of branches) {
      const username = `BO:${branch.code}`;
      const email = `bo${branch.code.toLowerCase()}shgb@shgb.bank.in`;

      // Check if username already exists
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        results.push({ branch: branch.code, status: 'skipped', reason: 'Username already exists' });
        continue;
      }

      // Check if branch already has a user (based on User entity relation)
      const existingBranchUser = await this.usersRepository.findOne({
        where: { branch: { id: branch.id } }
      });
      if (existingBranchUser) {
        results.push({ branch: branch.code, status: 'skipped', reason: 'Branch already has a user' });
        continue;
      }

      const newUser = this.usersRepository.create({
        username,
        password: hashedPassword,
        email,
        role: UserRole.BRANCH,
        branch: branch,
      });

      await this.usersRepository.save(newUser);
      results.push({ branch: branch.code, status: 'created' });
    }

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return { created, skipped, details: results };
  }

  async remove(id: number): Promise<void> {
    // 1. Find all attachments that will be affected by this user's deletion
    const attachments = await this.attachmentRepo.find({
      where: [
        { uploaded_by: { id } },
        { ticket: { created_by: { id } } },
        { comment: { user: { id } } }
      ]
    });

    // 2. Delete physical files associated with these attachments
    for (const attachment of attachments) {
      if (attachment.file_url) {
        try {
          if (fs.existsSync(attachment.file_url)) {
            await fs.promises.unlink(attachment.file_url);
          }
        } catch (err) {
          console.error(`Failed to delete file ${attachment.file_url}:`, err);
        }
      }
    }

    // 3. Delete the user (database cascade handles related tickets, comments, and attachment records)
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
