import { Controller, Get, Post, Body, UseGuards, Patch, Delete, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateRegionalOfficeDto } from '../regional-offices/dto/create-regional-office.dto';
import { UpdateRegionalOfficeDto } from '../regional-offices/dto/update-regional-office.dto';
import { CreateBranchDto } from '../branches/dto/create-branch.dto';
import { UpdateBranchDto } from '../branches/dto/update-branch.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('regionalOffice')
  async createRegionalOffice(@Body() dto: CreateRegionalOfficeDto) {
    return this.adminService.createRegionalOffice(dto);
  }

  @Get('regionalOffice')
  async getAllRegionalOffices() {
    return this.adminService.getAllRegionalOffices();
  }

  @Patch('regionalOffice/:id')
  async updateRegionalOffice(@Param('id') id: string, @Body() dto: UpdateRegionalOfficeDto) {
    return this.adminService.updateRegionalOffice(+id, dto);
  }

  @Delete('regionalOffice/:id')
  async removeRegionalOffice(@Param('id') id: string) {
    return this.adminService.removeRegionalOffice(+id);
  }

  @Post('branch')
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.adminService.createBranch(dto);
  }

  @Get('branch')
  async getAllBranches() {
    return this.adminService.getAllBranches();
  }

  @Patch('branch/:id')
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.adminService.updateBranch(+id, dto);
  }

  @Delete('branch/:id')
  async removeBranch(@Param('id') id: string) {
    return this.adminService.removeBranch(+id);
  }

  @Post('user')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('user')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('user/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(+id, dto);
  }

  @Delete('user/:id')
  async removeUser(@Param('id') id: string) {
    return this.adminService.removeUser(+id);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
