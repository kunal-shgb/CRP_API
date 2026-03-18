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

  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find({ relations: ['regionalOffice'] });
  }

  async findAllByRole(user: any): Promise<Branch[]> {
    if (user.role === UserRole.ADMIN) {
      return this.findAll();
    }
    // REGIONAL_OFFICE user — return branches under their RO
    if (user.role === UserRole.REGIONAL_OFFICE && user.regionalOffice?.id) {
      return this.branchRepository.find({
        where: { regionalOffice: { id: user.regionalOffice.id } },
        relations: ['regionalOffice'],
      });
    }
    // BRANCH user — return only their own branch
    if (user.role === UserRole.BRANCH && user.branch?.id) {
      const branch = await this.findOne(user.branch.id);
      return branch ? [branch] : [];
    }
    return [];
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
