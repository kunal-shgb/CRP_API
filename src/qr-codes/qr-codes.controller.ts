import {
  Controller, Get, Post, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import * as fs from 'fs';

import { QrCodesService } from './qr-codes.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('qr-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post()
  @Roles(UserRole.BRANCH, UserRole.REGIONAL_OFFICE)
  async create(@Body() createQrCodeDto: CreateQrCodeDto, @CurrentUser() user: any) {
    return this.qrCodesService.create(createQrCodeDto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.qrCodesService.findAllByRole(
      user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      { search, status }
    );
  }

  @Get('export/pending')
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE)
  async exportPending(@Res() res: Response) {
    const { filename, content } = await this.qrCodesService.exportPending();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
  async findOne(@Param('id') id: string) {
    return this.qrCodesService.findOne(+id);
  }

  @Post('upload/bulk')
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const tempDir = './uploads/temp_zips';
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
      },
      filename: (req, file, cb) => {
        const randomName = Array(16).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async bulkUploadZip(@UploadedFile() file: Express.Multer.File) {
    return this.qrCodesService.bulkUploadZip(file);
  }

  @Get('download/:id')
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
  async downloadFile(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const filePath = await this.qrCodesService.getQrPdfPath(+id, user);
    return res.sendFile(filePath, { root: '.' });
  }
}
