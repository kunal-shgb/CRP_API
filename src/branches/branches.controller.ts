import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) { }

//   @Post()
//   @Roles(UserRole.ADMIN)
//   create(@Body() createBranchDto: CreateBranchDto) {
//     return this.branchesService.create(createBranchDto);
//   }

//   @Get()
//   @Roles(UserRole.ADMIN, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
//   findAll(@Request() req) {
//     if (req.user.role === UserRole.ADMIN) {
//       return this.branchesService.findAll();
//     }
//     if (req.user.role === UserRole.REGIONAL_OFFICE) {
//       return this.branchesService.findAllForRegionalOffice(req.user.regionalOfficeId);
//     }
//     return this.branchesService.findAllForUser(req.user.id);
//   }

//   @Get(':id')
//   @Roles(UserRole.ADMIN, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
//   findOne(@Param('id') id: string) {
//     return this.branchesService.findOne(+id);
//   }

//   @Patch(':id')
//   @Roles(UserRole.ADMIN)
//   update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
//     return this.branchesService.update(+id, updateBranchDto);
//   }

//   @Delete(':id')
//   @Roles(UserRole.ADMIN)
//   remove(@Param('id') id: string) {
//     return this.branchesService.remove(+id);
//   }
}
