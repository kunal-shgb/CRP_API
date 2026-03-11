import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { RegionalOfficesService } from '../regional-offices/regional-offices.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    private roService: RegionalOfficesService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existing = await this.branchRepository.findOne({ where: { code: createBranchDto.code } });
    if (existing) {
      throw new ConflictException(`Branch with code ${createBranchDto.code} already exists`);
    }

    const ro = await this.roService.findOne(createBranchDto.roId);
    if (!ro) {
      throw new NotFoundException(`Regional Office with ID ${createBranchDto.roId} not found`);
    }

    const branch = this.branchRepository.create({
      ...createBranchDto,
      ro,
    });
    return this.branchRepository.save(branch);
  }

  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find({ relations: ['ro'] });
  }

  async findOne(id: number): Promise<Branch | null> {
    return this.branchRepository.findOne({ where: { id }, relations: ['ro'] });
  }
}
