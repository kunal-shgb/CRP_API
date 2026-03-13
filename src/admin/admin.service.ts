import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketLevel } from '../common/enums/ticket-level.enum';
import { RegionalOfficesService } from '../regional-offices/regional-offices.service';
import { BranchesService } from '../branches/branches.service';
import { UsersService } from '../users/users.service';
import { CreateRegionalOfficeDto } from '../regional-offices/dto/create-regional-office.dto';
import { UpdateRegionalOfficeDto } from '../regional-offices/dto/update-regional-office.dto';
import { CreateBranchDto } from '../branches/dto/create-branch.dto';
import { UpdateBranchDto } from '../branches/dto/update-branch.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private roService: RegionalOfficesService,
    private branchesService: BranchesService,
    private usersService: UsersService,
  ) { }

  // Management Delegation
  async createRO(dto: CreateRegionalOfficeDto) {
    return this.roService.create(dto);
  }

  async getAllROs() {
    return this.roService.findAll();
  }

  async createBranch(dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  async getAllBranches() {
    return this.branchesService.findAll();
  }

  async createUser(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }

  // Update & Delete overrides returning from respective services
  async updateRO(id: number, dto: UpdateRegionalOfficeDto) {
    return this.roService.update(id, dto);
  }

  async removeRO(id: number) {
    return this.roService.remove(id);
  }

  async updateBranch(id: number, dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  async removeBranch(id: number) {
    return this.branchesService.remove(id);
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  async removeUser(id: number) {
    return this.usersService.remove(id);
  }

  // Analytics
  async getAnalytics() {
    const totalOpen = await this.ticketRepository.count({ where: { status: TicketStatus.OPEN } });
    const totalClosed = await this.ticketRepository.count({ where: { status: TicketStatus.CLOSED } });

    const pendingAtBranch = await this.ticketRepository.count({ where: { current_level: TicketLevel.BRANCH, status: TicketStatus.OPEN } });
    const pendingAtRO = await this.ticketRepository.count({ where: { current_level: TicketLevel.REGIONAL_OFFICE, status: TicketStatus.OPEN } });
    const pendingAtHO = await this.ticketRepository.count({ where: { current_level: TicketLevel.HEAD_OFFICE, status: TicketStatus.OPEN } });

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
        regionalOffice: pendingAtRO,
        headOffice: pendingAtHO,
      },
      productWiseStats,
    };
  }
}
