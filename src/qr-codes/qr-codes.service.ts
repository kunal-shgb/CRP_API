import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { QrCode } from './entities/qr-code.entity';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { QrCodeStatus } from '../common/enums/qr-code-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class QrCodesService {
  constructor(
    @InjectRepository(QrCode)
    private qrCodeRepository: Repository<QrCode>,
  ) { }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateQrCodeDto, creator: any): Promise<QrCode | null> {
    const isBranch = creator.role === UserRole.BRANCH;
    const isRO = creator.role === UserRole.REGIONAL_OFFICE;

    const qrCode = this.qrCodeRepository.create({
      ...dto,
      created_by: creator,
      branch: isBranch ? creator.branch ?? null : null,
      regional_office: isBranch
        ? creator.branch?.regionalOffice ?? null
        : isRO
          ? creator.regionalOffice ?? null
          : null,
      status: QrCodeStatus.PENDING_QR_GENERATION,
    });

    const saved = await this.qrCodeRepository.save(qrCode);

    return this.qrCodeRepository.findOne({
      where: { id: saved.id },
      relations: ['created_by', 'branch', 'regional_office'],
    });
  }

  // ─── List (role-scoped) ───────────────────────────────────────────────────────

  async findAllByRole(
    user: any,
    page: number = 1,
    limit: number = 10,
    filters: { search?: string; status?: string } = {},
  ) {
    const query = this.qrCodeRepository.createQueryBuilder('qr');
    query.leftJoinAndSelect('qr.created_by', 'createdBy');
    query.leftJoinAndSelect('qr.branch', 'branch');
    query.leftJoinAndSelect('qr.regional_office', 'regionalOffice');

    // Role-based scoping
    if (user.role === UserRole.ADMIN) {
      // Admin sees all
    } else if (user.role === UserRole.HEAD_OFFICE) {
      // HO users are scoped to QR_CODE product type implicitly (they only reach
      // this endpoint when their productType === QR_CODE — enforced at controller level)
    } else if (user.role === UserRole.REGIONAL_OFFICE && user.regionalOffice?.id) {
      query.andWhere('regionalOffice.id = :roId', { roId: user.regionalOffice.id });
    } else if (user.role === UserRole.BRANCH && user.branch?.id) {
      query.andWhere('branch.id = :branchId', { branchId: user.branch.id });
    } else {
      return { data: [], meta: { totalRecords: 0, page, limit, totalPages: 0 } };
    }

    // Filters
    if (filters.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(qr.account_number) LIKE :search OR LOWER(qr.mobile_number) LIKE :search OR LOWER(qr.merchant_name) LIKE :search)',
        { search },
      );
    }
    if (filters.status && filters.status !== 'all') {
      query.andWhere('qr.status = :status', { status: filters.status });
    }

    const validLimit = Math.max(1, limit);
    const validPage = Math.max(1, page);
    const totalRecords = await query.getCount();

    query
      .skip((validPage - 1) * validLimit)
      .take(validLimit)
      .orderBy('qr.created_at', 'DESC');

    const data = await query.getMany();

    // Status summary counts
    const summaryQuery = this.qrCodeRepository.createQueryBuilder('qr');
    summaryQuery.leftJoin('qr.branch', 'branch');
    summaryQuery.leftJoin('qr.regional_office', 'regionalOffice');

    if (user.role === UserRole.ADMIN) {
      //
    } else if (user.role === UserRole.HEAD_OFFICE) {
      //
    } else if (user.role === UserRole.REGIONAL_OFFICE && user.regionalOffice?.id) {
      summaryQuery.andWhere('regionalOffice.id = :roId', { roId: user.regionalOffice.id });
    } else if (user.role === UserRole.BRANCH && user.branch?.id) {
      summaryQuery.andWhere('branch.id = :branchId', { branchId: user.branch.id });
    }

    if (filters.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      summaryQuery.andWhere(
        '(LOWER(qr.account_number) LIKE :search OR LOWER(qr.mobile_number) LIKE :search OR LOWER(qr.merchant_name) LIKE :search)',
        { search },
      );
    }
    if (filters.status && filters.status !== 'all') {
      summaryQuery.andWhere('qr.status = :status', { status: filters.status });
    }

    summaryQuery
      .select(`SUM(CASE WHEN qr.status = '${QrCodeStatus.PENDING_QR_GENERATION}' THEN 1 ELSE 0 END)`, 'totalPending')
      .addSelect(`SUM(CASE WHEN qr.status = '${QrCodeStatus.AVAILABLE_FOR_DOWNLOAD}' THEN 1 ELSE 0 END)`, 'totalAvailable');

    const rawSummary = await summaryQuery.getRawOne();

    return {
      data,
      meta: {
        totalRecords,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(totalRecords / validLimit),
        totalPending: Number(rawSummary?.totalPending) || 0,
        totalAvailable: Number(rawSummary?.totalAvailable) || 0,
      },
    };
  }

  // ─── Find One ─────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<QrCode> {
    const qr = await this.qrCodeRepository.findOne({
      where: { id },
      relations: ['created_by', 'branch', 'regional_office'],
    });
    if (!qr) throw new NotFoundException(`QR Code record #${id} not found`);
    return qr;
  }

  // ─── Export Pending (HO) ──────────────────────────────────────────────────────

  async exportPending(): Promise<{ filename: string; content: string }> {
    const records = await this.qrCodeRepository.find({
      where: { status: QrCodeStatus.PENDING_QR_GENERATION },
      relations: ['branch', 'regional_office'],
      order: { created_at: 'ASC' },
    });

    const header = 'MerchantTerminal|MerchantId|Mechant Name|MerchantMobno|MerchantAccountno|MerchantIFSCcode|MCCcode|SUBCODE|FEATUREDFLAG|Status|Emailid|TransactionType|Address line1|Address line2|Address line3|City|State|Country|Pincode|Solid|CircleId|MerchantType|AgentLinkingFlag';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    const filename = `Merchantonboarding_SHGB_QR_${dateStr}.txt`;

    const rows = records.map(qr => {
      return [
        'MERC', // MerchantTerminal
        `M${qr.account_number}`, // MerchantId
        qr.merchant_name, // Mechant Name
        `91${qr.mobile_number}`, // MerchantMobno
        qr.account_number, // MerchantAccountno
        qr.ifsc_code, // MerchantIFSCcode
        qr.mcc_code, // MCCcode
        '', // SUBCODE
        '', // FEATUREDFLAG
        'A', // Status
        qr.email_id, // Emailid
        qr.transaction_type || 'ALL', // TransactionType
        qr.address_line1, // Address line1
        qr.address_line2, // Address line2
        '', // Address line3
        qr.city, // City
        qr.state, // State
        'INDIA', // Country
        qr.pincode, // Pincode
        qr.sol_id, // Solid
        qr.circle_id || '', // CircleId
        'Y', // MerchantType
        'N', // AgentLinkingFlag
      ].join('|');
    });

    const content = [header, ...rows].join('\n') + '\n';

    const dirPath = path.join(process.cwd(), 'qrFiles');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, content);

    return { filename, content };
  }

  // ─── Bulk Upload ZIP (HO) ──────────────────────────────────────────────────────

  async bulkUploadZip(zipFile: Express.Multer.File): Promise<{
    processed: number;
    updated: string[];
    failed: { filename: string; reason: string }[];
  }> {
    if (!zipFile) {
      throw new BadRequestException('No ZIP file provided');
    }

    const zip = new AdmZip(zipFile.path);
    const entries = zip.getEntries();

    const updated: string[] = [];
    const failed: { filename: string; reason: string }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const filename = path.basename(entry.entryName);

      // Validate filename: {account_number}_{mobile_number}.pdf
      if (!filename.endsWith('.pdf')) {
        failed.push({ filename, reason: 'Not a PDF file' });
        continue;
      }

      const nameWithoutExt = filename.slice(0, -4); // remove .pdf
      const parts = nameWithoutExt.split('_');
      if (parts.length < 2) {
        failed.push({ filename, reason: 'Filename must be {account_number}_{mobile_number}.pdf' });
        continue;
      }

      // Last segment is mobile_number, everything before is account_number
      const mobile_number = parts[parts.length - 1];
      const account_number = parts.slice(0, parts.length - 1).join('_');

      // Look up the record
      const record = await this.qrCodeRepository.findOne({
        where: { account_number, mobile_number },
        relations: ['regional_office'],
      });

      if (!record) {
        failed.push({ filename, reason: `No record found for account=${account_number}, mobile=${mobile_number}` });
        continue;
      }

      // Determine destination folder using regional office name
      const roName = record.regional_office?.name
        ? record.regional_office.name.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'UNKNOWN_RO';
      const destDir = path.join('./uploads', 'qr-codes', roName);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const destPath = path.join(destDir, filename);

      // Extract and write the file
      const pdfBuffer = entry.getData();
      fs.writeFileSync(destPath, pdfBuffer);

      // Update record
      record.qr_pdf_url = destPath;
      record.qr_pdf_filename = filename;
      record.status = QrCodeStatus.AVAILABLE_FOR_DOWNLOAD;
      await this.qrCodeRepository.save(record);

      updated.push(filename);
    }

    // Clean up the uploaded ZIP file
    try {
      fs.unlinkSync(zipFile.path);
    } catch (_) { }

    return { processed: entries.length, updated, failed };
  }

  // ─── Download QR PDF ──────────────────────────────────────────────────────────

  async getQrPdfPath(id: number, user: any): Promise<string> {
    const record = await this.findOne(id);

    if (record.status !== QrCodeStatus.AVAILABLE_FOR_DOWNLOAD || !record.qr_pdf_url) {
      throw new BadRequestException('QR Code PDF is not yet available for download');
    }

    // Enforce ownership for BRANCH and RO
    if (user.role === UserRole.BRANCH) {
      if (record.branch?.id !== user.branch?.id) {
        throw new ForbiddenException('You do not have access to this QR Code PDF');
      }
    } else if (user.role === UserRole.REGIONAL_OFFICE) {
      if (record.regional_office?.id !== user.regionalOffice?.id) {
        throw new ForbiddenException('You do not have access to this QR Code PDF');
      }
    }

    return record.qr_pdf_url;
  }
}
