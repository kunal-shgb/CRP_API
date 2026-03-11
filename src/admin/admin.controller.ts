import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateRegionalOfficeDto } from '../regional-offices/dto/create-regional-office.dto';
import { CreateBranchDto } from '../branches/dto/create-branch.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('ro')
  async createRO(@Body() dto: CreateRegionalOfficeDto) {
    return this.adminService.createRO(dto);
  }

  @Get('ro')
  async getAllROs() {
    return this.adminService.getAllROs();
  }

  @Post('branch')
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.adminService.createBranch(dto);
  }

  @Get('branch')
  async getAllBranches() {
    return this.adminService.getAllBranches();
  }

  @Post('user')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('user')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
