import { Controller, Get, Post, Body, Param, UseGuards, UploadedFile, Query, UseInterceptors } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(UserRole.BRANCH)
  async create(@Body() createTicketDto: CreateTicketDto, @CurrentUser() user: any) {
    console.log(createTicketDto,user);
    return this.ticketsService.create(createTicketDto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HEAD_OFFICE, UserRole.REGIONAL_OFFICE, UserRole.BRANCH)
  async findAll(@CurrentUser() user: any) {
    return this.ticketsService.findAllByRole(user);
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
  async addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @CurrentUser() user: any) {
    return this.ticketsService.addComment(+id, dto, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.REGIONAL_OFFICE, UserRole.HEAD_OFFICE)
  async resolve(@Param('id') id: string, @Body('notes') notes: string, @CurrentUser() user: any) {
    return this.ticketsService.resolve(+id, notes, user);
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
  async uploadFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.ticketsService.uploadAttachment(+id, file, user);
  }
}
