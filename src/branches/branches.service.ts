import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RegionalOfficesService } from '../regional-offices/regional-offices.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    private roService: RegionalOfficesService,
  ) { }

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existing = await this.branchRepository.findOne({ where: { code: createBranchDto.code } });
    if (existing) {
      throw new ConflictException(`Branch with code ${createBranchDto.code} already exists`);
    }

    const regionalOffice = await this.roService.findOne(createBranchDto.roId);
    if (!regionalOffice) {
      throw new NotFoundException(`Regional Office with ID ${createBranchDto.roId} not found`);
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

    if (updateBranchDto.roId && updateBranchDto.roId !== branch.regionalOffice?.id) {
       const regionalOffice = await this.roService.findOne(updateBranchDto.roId);
       if (!regionalOffice) {
         throw new NotFoundException(`Regional Office with ID ${updateBranchDto.roId} not found`);
       }
       branch.regionalOffice = regionalOffice;
    }

    const { roId, ...updateData } = updateBranchDto;
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
