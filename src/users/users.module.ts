import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SeederService } from './seeder.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketComment } from '../tickets/entities/ticket-comment.entity';
import { TicketAttachment } from '../tickets/entities/ticket-attachment.entity';
import { RegionalOfficesModule } from '../regional-offices/regional-offices.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Ticket, TicketComment, TicketAttachment]),
    RegionalOfficesModule,
    BranchesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, SeederService],
  exports: [UsersService],
})
export class UsersModule {}
