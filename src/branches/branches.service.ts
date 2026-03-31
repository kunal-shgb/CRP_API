import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RegionalOfficesService } from '../regional-offices/regional-offices.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    private regionalOfficeService: RegionalOfficesService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existing = await this.branchRepository.findOne({ where: { code: createBranchDto.code } });
    if (existing) {
      throw new ConflictException(`Branch with code ${createBranchDto.code} already exists`);
    }

    const regionalOffice = await this.regionalOfficeService.findOne(createBranchDto.regionalOfficeId);
    if (!regionalOffice) {
      throw new NotFoundException(`Regional Office with ID ${createBranchDto.regionalOfficeId} not found`);
    }

    const branch = this.branchRepository.create({
      ...createBranchDto,
      regionalOffice,
    });
    return this.branchRepository.save(branch);
  }

  async findAllEntities(): Promise<Branch[]> {
    return this.branchRepository.find({ relations: ['regionalOffice'] });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, regionalOfficeId?: number): Promise<any> {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    
    const query = this.branchRepository.createQueryBuilder('branch')
      .leftJoinAndSelect('branch.regionalOffice', 'regionalOffice');

    if (regionalOfficeId) {
      query.andWhere('regionalOffice.id = :roId', { roId: regionalOfficeId });
    }

    if (search) {
      query.andWhere('(LOWER(branch.name) LIKE :search OR LOWER(branch.code) LIKE :search)', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('branch.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
  }

  async findAllByRole(user: any, page: number = 1, limit: number = 10, search?: string, regionalOfficeId?: number): Promise<any> {
    if (user.role === UserRole.ADMIN) {
      return this.findAll(page, limit, search, regionalOfficeId);
    }
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    
    const query = this.branchRepository.createQueryBuilder('branch')
      .leftJoinAndSelect('branch.regionalOffice', 'regionalOffice');

    // REGIONAL_OFFICE user — return branches under their RO
    if (user.role === UserRole.REGIONAL_OFFICE && user.regionalOffice?.id) {
      query.andWhere('regionalOffice.id = :roId', { roId: user.regionalOffice.id });
    } else if (user.role === UserRole.BRANCH && user.branch?.id) {
      // BRANCH user — return only their own branch
      query.andWhere('branch.id = :branchId', { branchId: user.branch.id });
    } else {
      return { data: [], meta: { totalRecords: 0, page: validPage, limit: validLimit, totalPages: 0 } };
    }

    if (search) {
      query.andWhere('(LOWER(branch.name) LIKE :search OR LOWER(branch.code) LIKE :search)', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('branch.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
  }

  async findOne(id: number): Promise<Branch | null> {
    return this.branchRepository.findOne({ where: { id }, relations: ['regionalOffice'] });
  }

  async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    if (updateBranchDto.code && updateBranchDto.code !== branch.code) {
      const existing = await this.branchRepository.findOne({ where: { code: updateBranchDto.code } });
      if (existing) {
        throw new ConflictException(`Branch with code ${updateBranchDto.code} already exists`);
      }
    }

    if (updateBranchDto.regionalOfficeId && updateBranchDto.regionalOfficeId !== branch.regionalOffice?.id) {
      const regionalOffice = await this.regionalOfficeService.findOne(updateBranchDto.regionalOfficeId);
      if (!regionalOffice) {
        throw new NotFoundException(`Regional Office with ID ${updateBranchDto.regionalOfficeId} not found`);
      }
      branch.regionalOffice = regionalOffice;
    }

    const { regionalOfficeId, ...updateData } = updateBranchDto;
    Object.assign(branch, updateData);

    return this.branchRepository.save(branch);
  }

  async remove(id: number): Promise<void> {
    const result = await this.branchRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
  }
}
