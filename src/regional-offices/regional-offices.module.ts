import { Module } from '@nestjs/common';
import { RegionalOfficesService } from './regional-offices.service';
import { RegionalOfficesController } from './regional-offices.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionalOffice } from './entities/regional-office.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegionalOffice])],
  controllers: [RegionalOfficesController],
  providers: [RegionalOfficesService],
  exports: [RegionalOfficesService],
})
export class RegionalOfficesModule {}
