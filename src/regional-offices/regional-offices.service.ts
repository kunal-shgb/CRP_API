import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionalOffice } from './entities/regional-office.entity';
import { CreateRegionalOfficeDto } from './dto/create-regional-office.dto';

@Injectable()
export class RegionalOfficesService {
  constructor(
    @InjectRepository(RegionalOffice)
    private roRepository: Repository<RegionalOffice>,
  ) {}

  async create(createRoDto: CreateRegionalOfficeDto): Promise<RegionalOffice> {
    const existing = await this.roRepository.findOne({ where: { code: createRoDto.code } });
    if (existing) {
      throw new ConflictException(`Regional Office with code ${createRoDto.code} already exists`);
    }
    const ro = this.roRepository.create(createRoDto);
    return this.roRepository.save(ro);
  }

  async findAll(): Promise<RegionalOffice[]> {
    return this.roRepository.find({ relations: ['branches'] });
  }

  async findOne(id: number): Promise<RegionalOffice | null> {
    return this.roRepository.findOne({ where: { id }, relations: ['branches'] });
  }
}
