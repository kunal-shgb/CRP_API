import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketLevel } from '../common/enums/ticket-level.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async getAnalytics() {
    const totalOpen = await this.ticketRepository.count({ where: { status: TicketStatus.OPEN } });
    const totalClosed = await this.ticketRepository.count({ where: { status: TicketStatus.CLOSED } });

    const pendingAtBranch = await this.ticketRepository.count({ where: { current_level: TicketLevel.BRANCH, status: TicketStatus.OPEN } });
    const pendingAtRegionalOffice = await this.ticketRepository.count({ where: { current_level: TicketLevel.REGIONAL_OFFICE, status: TicketStatus.OPEN } });
    const pendingAtHeadOffice = await this.ticketRepository.count({ where: { current_level: TicketLevel.HEAD_OFFICE, status: TicketStatus.OPEN } });

    const productWiseStats = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.product_type', 'product')
      .addSelect('COUNT(ticket.id)', 'count')
      .groupBy('ticket.product_type')
      .getRawMany();

    return {
      totalOpen,
      totalClosed,
      pending: {
        branch: pendingAtBranch,
        regionalOffice: pendingAtRegionalOffice,
        headOffice: pendingAtHeadOffice,
      },
      productWiseStats,
    };
  }
}
