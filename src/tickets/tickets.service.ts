import { Injectable, ConflictException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '../users/entities/user.entity';
import { IssueType } from '../common/enums/issue-type.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketLevel } from '../common/enums/ticket-level.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(TicketAttachment)
    private attachmentRepository: Repository<TicketAttachment>,
    private usersService: UsersService,
  ) {}

  async create(createTicketDto: CreateTicketDto, creator: User): Promise<Ticket> {
    // 1. Uniqueness Validation
    if (createTicketDto.issue_type !== IssueType.OTHERS && createTicketDto.utr_rrn) {
      const existing = await this.ticketRepository.findOne({
        where: { utr_rrn: createTicketDto.utr_rrn, status: TicketStatus.OPEN },
      });
      if (existing) {
        throw new ConflictException(`An open ticket already exists for UTR/RRN: ${createTicketDto.utr_rrn}`);
      }
    }

    // 2. Resolve User relations (Branch -> RO mapping)
    // Refresh user to get branch and ro relations
    const user = await this.usersService.findOne(creator.id);
    if (!user || !user.branch || !user.branch.ro) {
      throw new ForbiddenException('User must be associated with a branch mapped to a Regional Office to raise tickets');
    }

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      created_by: user,
      assigned_ro: user.branch.ro,
      status: TicketStatus.OPEN,
      current_level: TicketLevel.BRANCH,
    });

    return this.ticketRepository.save(ticket);
  }

  async findAllForBranch(branchId: number) {
    return this.ticketRepository.find({
      where: { created_by: { branch: { id: branchId } } },
      relations: ['created_by', 'assigned_ro'],
      order: { created_at: 'DESC' },
    });
  }

  async findAllForRO(roId: number) {
    return this.ticketRepository.find({
      where: { assigned_ro: { id: roId } },
      relations: ['created_by', 'assigned_ro'],
      order: { created_at: 'DESC' },
    });
  }

  async findAllForHO(productType: string) {
    return this.ticketRepository.find({
      where: { current_level: TicketLevel.HO, product_type: productType as any },
      relations: ['created_by', 'assigned_ro'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['created_by', 'assigned_ro', 'comments', 'comments.user', 'attachments'],
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

  async escalateToHO(id: number, notes: string) {
    const ticket = await this.findOne(id);
    ticket.current_level = TicketLevel.HO;
    ticket.status = TicketStatus.ESCALATED_HO;
    ticket.resolution_notes = notes; // Escalation notes
    return this.ticketRepository.save(ticket);
  }

  async search(filters: any) {
    const query = this.ticketRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.created_by', 'user')
      .leftJoinAndSelect('user.branch', 'branch')
      .leftJoinAndSelect('ticket.assigned_ro', 'ro');

    if (filters.utr_rrn) {
      query.andWhere('ticket.utr_rrn = :utr', { utr: filters.utr_rrn });
    }
    if (filters.product_type) {
      query.andWhere('ticket.product_type = :product', { product: filters.product_type });
    }
    if (filters.branch_id) {
      query.andWhere('branch.id = :branchId', { branchId: filters.branch_id });
    }
    if (filters.ro_id) {
      query.andWhere('ro.id = :roId', { roId: filters.ro_id });
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

    return query.getMany();
  }

  async uploadAttachment(ticketId: number, file: Express.Multer.File, user: User) {
    const ticket = await this.findOne(ticketId);
    const attachment = this.attachmentRepository.create({
      ticket,
      file_url: file.path,
      file_name: file.originalname,
      uploaded_by: user,
    });
    return this.attachmentRepository.save(attachment);
  }
}
