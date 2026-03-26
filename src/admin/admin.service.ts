import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketLevel } from '../common/enums/ticket-level.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) { }

  async getAnalytics() {
    const total = await this.ticketRepository.count();
    const pendingAtRegionalOffice = await this.ticketRepository.count({ where: { current_level: TicketLevel.REGIONAL_OFFICE, status: TicketStatus.PENDING_AT_RO } });
    const pendingAtHeadOffice = await this.ticketRepository.count({ where: { current_level: TicketLevel.HEAD_OFFICE, status: TicketStatus.PENDING_AT_RO } });

    const productWiseStats = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.product_type', 'product')
      .addSelect('COUNT(ticket.id)', 'count')
      .groupBy('ticket.product_type')
      .getRawMany();

    return {
      total,
      pending: {
        regionalOffice: pendingAtRegionalOffice,
        headOffice: pendingAtHeadOffice,
      },
      productWiseStats,
    };
  }
}
