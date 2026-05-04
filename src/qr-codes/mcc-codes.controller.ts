import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MccCodesService } from './mcc-codes.service';
import { CreateMccCodeDto, UpdateMccCodeDto } from './dto/mcc-code.dto';

@Controller('mcc-codes')
export class MccCodesController {
  constructor(private readonly mccCodesService: MccCodesService) {}

  @Post()
  create(@Body() createMccCodeDto: CreateMccCodeDto) {
    return this.mccCodesService.create(createMccCodeDto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.mccCodesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mccCodesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMccCodeDto: UpdateMccCodeDto,
  ) {
    return this.mccCodesService.update(id, updateMccCodeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mccCodesService.remove(id);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(@UploadedFile() file: Express.Multer.File) {
    return this.mccCodesService.handleBulkUpload(file);
  }
}
