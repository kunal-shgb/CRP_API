import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionalOffice } from './entities/regional-office.entity';
import { CreateRegionalOfficeDto } from './dto/create-regional-office.dto';
import { UpdateRegionalOfficeDto } from './dto/update-regional-office.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class RegionalOfficesService {
  constructor(
    @InjectRepository(RegionalOffice)
    private regionalOfficeRepository: Repository<RegionalOffice>,
  ) {}

  async create(createRoDto: CreateRegionalOfficeDto): Promise<RegionalOffice> {
    const existing = await this.regionalOfficeRepository.findOne({ where: { code: createRoDto.code } });
    if (existing) {
      throw new ConflictException(`Regional Office with code ${createRoDto.code} already exists`);
    }
    const regionalOffice = this.regionalOfficeRepository.create(createRoDto);
    return this.regionalOfficeRepository.save(regionalOffice);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<any> {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    
    const query = this.regionalOfficeRepository.createQueryBuilder('ro')
      .leftJoinAndSelect('ro.branches', 'branches');

    if (search) {
      query.andWhere('(LOWER(ro.name) LIKE :search OR LOWER(ro.code) LIKE :search)', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('ro.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
  }

  async findAllByRole(user: any, page: number = 1, limit: number = 10, search?: string): Promise<any> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.HEAD_OFFICE) {
      return this.findAll(page, limit, search);
    }
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);

    const query = this.regionalOfficeRepository.createQueryBuilder('ro')
      .leftJoinAndSelect('ro.branches', 'branches');

    // REGIONAL_OFFICE user — return only their own RO
    if (user.regionalOffice?.id) {
      query.andWhere('ro.id = :roId', { roId: user.regionalOffice.id });
    } else {
      return { data: [], meta: { totalRecords: 0, page: validPage, limit: validLimit, totalPages: 0 } };
    }

    if (search) {
      query.andWhere('(LOWER(ro.name) LIKE :search OR LOWER(ro.code) LIKE :search)', { search: `%${search.toLowerCase()}%` });
    }

    const [data, totalRecords] = await query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('ro.id', 'DESC')
      .getManyAndCount();

    return { data, meta: { totalRecords, page: validPage, limit: validLimit, totalPages: Math.ceil(totalRecords / validLimit) } };
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
