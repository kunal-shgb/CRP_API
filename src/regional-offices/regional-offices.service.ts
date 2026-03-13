import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionalOffice } from './entities/regional-office.entity';
import { CreateRegionalOfficeDto } from './dto/create-regional-office.dto';
import { UpdateRegionalOfficeDto } from './dto/update-regional-office.dto';

@Injectable()
export class RegionalOfficesService {
  constructor(
    @InjectRepository(RegionalOffice)
    private roRepository: Repository<RegionalOffice>,
  ) { }

  async create(createRoDto: CreateRegionalOfficeDto): Promise<RegionalOffice> {
    const existing = await this.roRepository.findOne({ where: { code: createRoDto.code } });
    if (existing) {
      throw new ConflictException(`Regional Office with code ${createRoDto.code} already exists`);
    }
    const regionalOffice = this.roRepository.create(createRoDto);
    return this.roRepository.save(regionalOffice);
  }

  async findAll(): Promise<RegionalOffice[]> {
    return this.roRepository.find({ relations: ['branches'] });
  }

  async findOne(id: number): Promise<RegionalOffice | null> {
    return this.roRepository.findOne({ where: { id }, relations: ['branches'] });
  }

  async update(id: number, updateRoDto: UpdateRegionalOfficeDto): Promise<RegionalOffice> {
    const ro = await this.findOne(id);
    if (!ro) {
      throw new NotFoundException(`Regional Office with ID ${id} not found`);
    }

    if (updateRoDto.code && updateRoDto.code !== ro.code) {
      const existing = await this.roRepository.findOne({ where: { code: updateRoDto.code } });
      if (existing) {
        throw new ConflictException(`Regional Office with code ${updateRoDto.code} already exists`);
      }
    }

    Object.assign(ro, updateRoDto);
    return this.roRepository.save(ro);
  }

  async remove(id: number): Promise<void> {
    const result = await this.roRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Regional Office with ID ${id} not found`);
    }
  }
}
