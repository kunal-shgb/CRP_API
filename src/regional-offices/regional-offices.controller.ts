import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RegionalOfficesService } from './regional-offices.service';
import { CreateRegionalOfficeDto } from './dto/create-regional-office.dto';
import { UpdateRegionalOfficeDto } from './dto/update-regional-office.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('regional-offices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionalOfficesController {
  constructor(private readonly regionalOfficesService: RegionalOfficesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createRegionalOfficeDto: CreateRegionalOfficeDto) {
    return this.regionalOfficesService.create(createRegionalOfficeDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.REGIONAL_OFFICE)
  findAll(@CurrentUser() user: any, @Query('page') page: string, @Query('limit') limit: string) {
    return this.regionalOfficesService.findAllByRole(user, parseInt(page) || 1, parseInt(limit) || 10);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.REGIONAL_OFFICE)
  findOne(@Param('id') id: string) {
    return this.regionalOfficesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateRegionalOfficeDto: UpdateRegionalOfficeDto) {
    return this.regionalOfficesService.update(+id, updateRegionalOfficeDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.regionalOfficesService.remove(+id);
  }
}
