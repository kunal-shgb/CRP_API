import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCodesService } from './qr-codes.service';
import { QrCodesController } from './qr-codes.controller';
import { QrCode } from './entities/qr-code.entity';
import { MccCode } from './entities/mcc-code.entity';
import { UsersModule } from '../users/users.module';
import { MccCodesController } from './mcc-codes.controller';
import { MccCodesService } from './mcc-codes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QrCode, MccCode]),
    UsersModule,
  ],
  controllers: [QrCodesController, MccCodesController],
  providers: [QrCodesService, MccCodesService],
})
export class QrCodesModule {}
