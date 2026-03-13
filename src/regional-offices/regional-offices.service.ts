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
    private regionalOfficeRepository: Repository<RegionalOffice>,
  ) { }

  async create(createRoDto: CreateRegionalOfficeDto): Promise<RegionalOffice> {
    const existing = await this.regionalOfficeRepository.findOne({ where: { code: createRoDto.code } });
    if (existing) {
      throw new ConflictException(`Regional Office with code ${createRoDto.code} already exists`);
    }
    const regionalOffice = this.regionalOfficeRepository.create(createRoDto);
    return this.regionalOfficeRepository.save(regionalOffice);
  }

  async findAll(): Promise<RegionalOffice[]> {
    return this.regionalOfficeRepository.find({ relations: ['branches'] });
  }

  async findOne(id: number): Promise<RegionalOffice | null> {
    return this.regionalOfficeRepository.findOne({ where: { id }, relations: ['branches'] });
  }

  async update(id: number, updateRegionalOfficeDto: UpdateRegionalOfficeDto): Promise<RegionalOffice> {
    const regionalOffice = await this.findOne(id);
    if (!regionalOffice) {
      throw new NotFoundException(`Regional Office with ID ${id} not found`);
    }

    if (updateRegionalOfficeDto.code && updateRegionalOfficeDto.code !== regionalOffice.code) {
      const existing = await this.regionalOfficeRepository.findOne({ where: { code: updateRegionalOfficeDto.code } });
      if (existing) {
        throw new ConflictException(`Regional Office with code ${updateRegionalOfficeDto.code} already exists`);
      }
    }

    Object.assign(regionalOffice, updateRegionalOfficeDto);
    return this.regionalOfficeRepository.save(regionalOffice);
  }

  async remove(id: number): Promise<void> {
    const result = await this.regionalOfficeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Regional Office with ID ${id} not found`);
    }
  }
}
