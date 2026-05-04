import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { MccCode } from './entities/mcc-code.entity';
import { CreateMccCodeDto, UpdateMccCodeDto } from './dto/mcc-code.dto';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
@Injectable()
export class MccCodesService implements OnModuleInit {
  private readonly logger = new Logger(MccCodesService.name);

  constructor(
    @InjectRepository(MccCode)
    private mccCodeRepository: Repository<MccCode>,
  ) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

  async seedInitialData() {
    const count = await this.mccCodeRepository.count();
    if (count > 0) {
      this.logger.log('MCC Codes already seeded.');
      return;
    }

    const csvFilePath = path.join(process.cwd(), 'MCC.csv');
    if (!fs.existsSync(csvFilePath)) {
      this.logger.warn(`Initial MCC.csv not found at ${csvFilePath}`);
      return;
    }

    this.logger.log('Seeding initial MCC data from CSV...');
    await this.processCsvFile(csvFilePath);
    this.logger.log('MCC data seeded successfully.');
  }

  async create(createMccCodeDto: CreateMccCodeDto): Promise<MccCode> {
    const mccCode = this.mccCodeRepository.create(createMccCodeDto);
    return this.mccCodeRepository.save(mccCode);
  }

  async findAll(search?: string): Promise<MccCode[]> {
    if (search) {
      return this.mccCodeRepository.find({
        where: [
          { mcc_code: ILike(`%${search}%`) },
          { mcc_name: ILike(`%${search}%`) },
        ],
        take: 50,
      });
    }
    return this.mccCodeRepository.find({ take: 50 });
  }

  async findOne(id: number): Promise<MccCode | null> {
    return this.mccCodeRepository.findOne({ where: { id } });
  }

  async update(id: number, updateMccCodeDto: UpdateMccCodeDto): Promise<MccCode | null> {
    await this.mccCodeRepository.update(id, updateMccCodeDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.mccCodeRepository.delete(id);
  }

  async processCsvFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: Partial<MccCode>[] = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          // The CSV columns are 'Code' and 'Merchant Category Name' based on the file content
          const code = data['Code'];
          const name = data['Merchant Category Name'];
          if (code && name) {
            results.push({ mcc_code: code.trim(), mcc_name: name.trim() });
          }
        })
        .on('end', async () => {
          try {
            // Bulk insert is faster, but we should handle potential duplicates
            // typeorm doesn't have a clean upsert for generic use, so we save in chunks
            const chunkSize = 500;
            for (let i = 0; i < results.length; i += chunkSize) {
              const chunk = results.slice(i, i + chunkSize);
              await this.mccCodeRepository
                .createQueryBuilder()
                .insert()
                .into(MccCode)
                .values(chunk)
                .orIgnore() // Ignore duplicates
                .execute();
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async handleBulkUpload(file: Express.Multer.File): Promise<{ message: string }> {
    const tempFilePath = path.join(process.cwd(), 'uploads', `temp-mcc-${Date.now()}.csv`);
    fs.writeFileSync(tempFilePath, file.buffer);
    try {
      await this.processCsvFile(tempFilePath);
      return { message: 'Bulk upload completed successfully' };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}
