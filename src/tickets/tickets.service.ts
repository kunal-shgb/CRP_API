import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '../users/entities/user.entity';
import { TicketType } from '../common/enums/ticket-type.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketLevel } from '../common/enums/ticket-level.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(TicketAttachment)
    private attachmentRepository: Repository<TicketAttachment>,
  ) { }

  async create(createTicketDto: CreateTicketDto, creator: User): Promise<Ticket | null> {
    // 1. Uniqueness Validation
    if (createTicketDto.ticket_type !== TicketType.OTHERS && createTicketDto.utr_rrn) {
      const existing = await this.ticketRepository.findOne({
        where: { utr_rrn: createTicketDto.utr_rrn, status: TicketStatus.PENDING_AT_RO },
      });
      if (existing) {
        throw new ConflictException(`An open ticket already exists for UTR/RRN: ${createTicketDto.utr_rrn}`);
      }
    }

    const isBranch = creator.role === UserRole.BRANCH;

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      created_by: creator,
      // Branch → assign to their linked RO; RO → null (implicitly routed to HO)
      assigned_regionalOffice: isBranch ? creator.branch?.regionalOffice ?? null : null,
      status: isBranch ? TicketStatus.PENDING_AT_RO : TicketStatus.ESCALATED_TO_HEAD_OFFICE,
      current_level: isBranch ? TicketLevel.REGIONAL_OFFICE : TicketLevel.HEAD_OFFICE,
    });

    const saved = await this.ticketRepository.save(ticket);

    // Reload with role-appropriate relations for a complete response
    return this.ticketRepository.findOne({
      where: { id: saved.id },
      relations: isBranch
        ? ['created_by', 'created_by.branch', 'created_by.branch.regionalOffice', 'assigned_regionalOffice']
        : ['created_by', 'created_by.regionalOffice'],
    });
  }

  async findAllByRole(user: any, page: number = 1, limit: number = 10, filters: any = {}) {
    const query = this.ticketRepository.createQueryBuilder('ticket');
    query.leftJoinAndSelect('ticket.created_by', 'createdBy');
    query.leftJoinAndSelect('ticket.assigned_regionalOffice', 'assignedRO');
    query.leftJoin('createdBy.branch', 'creatorBranch');

    if (user.role === UserRole.ADMIN) {
      // Admin sees all
    } else if (user.role === UserRole.HEAD_OFFICE) {
      query.andWhere('ticket.current_level = :level', { level: TicketLevel.HEAD_OFFICE });
      query.andWhere('ticket.product_type = :productType', { productType: user.productType });
    } else if (user.role === UserRole.REGIONAL_OFFICE && user.regionalOffice?.id) {
      // Tickets assigned to this RO OR tickets created by users of this RO
      query.andWhere(
        '(assignedRO.id = :roId OR (createdBy.regionalOffice_id = :roId AND ticket.assigned_regionalOffice IS NULL))',
        { roId: user.regionalOffice.id },
      );
    } else if (user.role === UserRole.BRANCH && user.branch?.id) {
      query.andWhere('creatorBranch.id = :branchId', { branchId: user.branch.id });
    } else {
      return { data: [], meta: { totalRecords: 0, page, limit, totalPages: 0, productMetrics: [] } };
    }

    // Apply Filters
    if (filters.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(CAST(ticket.id AS TEXT)) LIKE :search OR LOWER(ticket.utr_rrn) LIKE :search OR LOWER(ticket.account_number) LIKE :search)',
        { search },
      );
    }
    if (filters.status && filters.status !== 'all') {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.productType && filters.productType !== 'all') {
      query.andWhere('ticket.product_type = :productTypeFilter', { productTypeFilter: filters.productType });
    }
    if (filters.regionalOfficeId && filters.regionalOfficeId !== 'all') {
      query.andWhere('assignedRO.id = :roIdFilter', { roIdFilter: filters.regionalOfficeId });
    }
    const aggQuery = query.clone();
    aggQuery.select('ticket.product_type', 'productType')
      .addSelect('COUNT(DISTINCT ticket.id)', 'totalCount')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' THEN 1 ELSE 0 END)`, 'openCount')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.CLOSED}' THEN 1 ELSE 0 END)`, 'closedCount')
      .groupBy('ticket.product_type');

    const rawAgg = await aggQuery.getRawMany();
    const productMetrics = rawAgg.map(item => ({
      productType: item.productType,
      totalCount: Number(item.totalCount) || 0,
      openCount: Number(item.openCount) || 0,
      closedCount: Number(item.closedCount) || 0,
    }));

    const summaryQuery = query.clone();
    summaryQuery
      .select(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' THEN 1 ELSE 0 END)`, 'totalOpen')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.CLOSED}' THEN 1 ELSE 0 END)`, 'totalClosed')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' AND ticket.current_level = '${TicketLevel.REGIONAL_OFFICE}' THEN 1 ELSE 0 END)`, 'totalPendingAtRO')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.ESCALATED_TO_HEAD_OFFICE}' THEN 1 ELSE 0 END)`, 'totalEscalatedAtHO');

    const rawSummary = await summaryQuery.getRawOne();
    const statusSummary = {
      totalOpen: Number(rawSummary?.totalPendingAtRO) + Number(rawSummary?.totalEscalatedAtHO) || 0,
      totalClosed: Number(rawSummary?.totalClosed) || 0,
      totalPendingAtRO: Number(rawSummary?.totalPendingAtRO) || 0,
      totalEscalatedAtHO: Number(rawSummary?.totalEscalatedAtHO) || 0,
    };

    // Data fetching (no need to rejoin relations here as already joined)

    const validLimit = Math.max(1, limit);
    const validPage = Math.max(1, page);
    const totalRecords = await query.getCount();

    query.skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('ticket.updated_at', 'ASC');

    const data = await query.getMany();

    return {
      data,
      meta: {
        totalRecords,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(totalRecords / validLimit),
        productMetrics,
        ...statusSummary,
      }
    };
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['created_by', 'assigned_regionalOffice', 'comments', 'comments.user', 'comments.attachments', 'attachments'],
      order: {
        comments: {
          created_at: 'ASC',
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async addComment(ticketId: number, dto: CreateCommentDto, user: User) {
    const ticket = await this.findOne(ticketId);
    const comment = this.commentRepository.create({
      ticket,
      user,
      comment: dto.comment,
    });
    return this.commentRepository.save(comment);
  }

  async resolve(id: number, notes: string, resolver: User) {
    const ticket = await this.findOne(id);
    ticket.status = TicketStatus.CLOSED;
    ticket.resolution_notes = notes;
    return this.ticketRepository.save(ticket);
  }

  async escalateToHeadOffice(id: number, notes: string) {
    const ticket = await this.findOne(id);
    ticket.current_level = TicketLevel.HEAD_OFFICE;
    ticket.status = TicketStatus.ESCALATED_TO_HEAD_OFFICE;
    ticket.resolution_notes = notes; // Escalation notes
    return this.ticketRepository.save(ticket);
  }

  async search(filters: any) {
    const query = this.ticketRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.created_by', 'user')
      .leftJoinAndSelect('user.branch', 'branch')
      .leftJoinAndSelect('ticket.assigned_regionalOffice', 'regionalOffice');

    if (filters.utr_rrn) {
      query.andWhere('ticket.utr_rrn = :utr', { utr: filters.utr_rrn });
    }
    if (filters.product_type) {
      query.andWhere('ticket.product_type = :product', { product: filters.product_type });
    }
    if (filters.branch_id) {
      query.andWhere('branch.id = :branchId', { branchId: filters.branch_id });
    }
    if (filters.regionalOffice_id) {
      query.andWhere('regionalOffice.id = :regionalOfficeId', { regionalOfficeId: filters.regionalOffice_id });
    }
    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.startDate && filters.endDate) {
      query.andWhere('ticket.created_at BETWEEN :start AND :end', {
        start: new Date(filters.startDate),
        end: new Date(filters.endDate),
      });
    }

    // Get aggregated metrics based on current filters before left joins affect row counts
    const aggQuery = query.clone();
    aggQuery.select('ticket.product_type', 'productType')
      .addSelect('COUNT(DISTINCT ticket.id)', 'totalCount')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' THEN 1 ELSE 0 END)`, 'openCount')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.CLOSED}' THEN 1 ELSE 0 END)`, 'closedCount')
      .groupBy('ticket.product_type');
    const rawAgg = await aggQuery.getRawMany();
    const productMetrics = rawAgg.map(item => ({
      productType: item.productType,
      totalCount: Number(item.totalCount) || 0,
      openCount: Number(item.openCount) || 0,
      closedCount: Number(item.closedCount) || 0,
    }));

    const summaryQuery = query.clone();
    summaryQuery
      .select(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' THEN 1 ELSE 0 END)`, 'totalOpen')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.CLOSED}' THEN 1 ELSE 0 END)`, 'totalClosed')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.PENDING_AT_RO}' AND ticket.current_level = '${TicketLevel.REGIONAL_OFFICE}' THEN 1 ELSE 0 END)`, 'totalPendingAtRO')
      .addSelect(`SUM(CASE WHEN ticket.status = '${TicketStatus.ESCALATED_TO_HEAD_OFFICE}' THEN 1 ELSE 0 END)`, 'totalEscalatedAtHO');

    const rawSummary = await summaryQuery.getRawOne();
    const statusSummary = {
      totalOpen: Number(rawSummary?.totalOpen) || 0,
      totalClosed: Number(rawSummary?.totalClosed) || 0,
      totalEscalatedAtHO: Number(rawSummary?.totalEscalatedAtHO) || 0,
    };

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);

    const totalRecords = await query.getCount();

    query.skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('ticket.updated_at', 'ASC');

    const data = await query.getMany();

    return {
      data,
      meta: {
        totalRecords,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(totalRecords / validLimit),
        productMetrics,
        ...statusSummary,
      }
    };
  }

  async uploadAttachment(ticketId: number, file: Express.Multer.File, user: User, commentId?: number) {
    const ticket = await this.findOne(ticketId);
    const attachment = this.attachmentRepository.create({
      ticket,
      file_url: file.path,
      file_name: file.originalname,
      uploaded_by: user,
      comment: commentId ? { id: commentId } as any : null,
    });
    return this.attachmentRepository.save(attachment);
  }
}
