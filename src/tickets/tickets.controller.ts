import { Controller, Get, Post, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  @Post()
  @Roles(UserRole.BRANCH)
  async create(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(createTicketDto, req.user);
  }

  @Get('branch')
  @Roles(UserRole.BRANCH)
  async findAllForBranch(@Request() req) {
    return this.ticketsService.findAllForBranch(req.user.branchId);
  }

  @Get('regionalOffice')
  @Roles(UserRole.REGIONAL_OFFICE)
  async findAllForRegionalOffice(@Request() req) {
    return this.ticketsService.findAllForRegionalOffice(req.user.regionalOfficeId);
  }

  @Get('headOffice')
  @Roles(UserRole.HEAD_OFFICE)
  async findAllForHeadOffice(@Request() req) {
    return this.ticketsService.findAllForHeadOffice(req.user.productType);
  }

  @Get('search')
  async search(@Query() filters: any) {
    return this.ticketsService.search(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(+id);
  }

  @Post(':id/comments')
  async addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @Request() req) {
    return this.ticketsService.addComment(+id, dto, req.user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.REGIONAL_OFFICE, UserRole.HEAD_OFFICE)
  async resolve(@Param('id') id: string, @Body('notes') notes: string, @Request() req) {
    return this.ticketsService.resolve(+id, notes, req.user);
  }

  @Post(':id/escalate')
  @Roles(UserRole.REGIONAL_OFFICE)
  async escalate(@Param('id') id: string, @Body('notes') notes: string) {
    return this.ticketsService.escalateToHeadOffice(+id, notes);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.ticketsService.uploadAttachment(+id, file, req.user);
  }
}
