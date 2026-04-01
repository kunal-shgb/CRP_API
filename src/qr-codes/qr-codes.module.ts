import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCodesService } from './qr-codes.service';
import { QrCodesController } from './qr-codes.controller';
import { QrCode } from './entities/qr-code.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QrCode]),
    UsersModule,
  ],
  controllers: [QrCodesController],
  providers: [QrCodesService],
})
export class QrCodesModule {}
