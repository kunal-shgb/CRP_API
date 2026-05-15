import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
// mupdf is ESM-only (top-level await) — must be loaded via dynamic import()
import { QrCode } from './entities/qr-code.entity';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { UpdateQrCodeDto } from './dto/update-qr-code.dto';

import { QrCodeStatus } from '../common/enums/qr-code-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

interface ImageConfig {
  template_path: string;
  output_dir: string;
  dpi: number;
  page_index: number;
  crop: { x: number; y: number; width: number; height: number };
  paste: { x: number; y: number };
}

@Injectable()
export class QrCodesService {
  constructor(
    @InjectRepository(QrCode)
    private qrCodeRepository: Repository<QrCode>,
  ) { }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateQrCodeDto, creator: any): Promise<QrCode | null> {

    // unique accountNumber and mobile number validation
    const existingQrCode = await this.qrCodeRepository.findOne({
      where: [
        { account_number: dto.account_number },
        { mobile_number: dto.mobile_number },
      ],
    });
    if (existingQrCode) {
      throw new BadRequestException('Account number or mobile number already exists.');
    }
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

  async update(id: number, dto: UpdateQrCodeDto, user: any): Promise<QrCode> {
    const qr = await this.findOne(id);

    // Permission check
    if (user.role === UserRole.BRANCH) {
      if (qr.branch?.id !== user.branch?.id) {
        throw new ForbiddenException('You can only update QR codes for your own branch');
      }
    } else if (user.role === UserRole.REGIONAL_OFFICE) {
      if (qr.regional_office?.id !== user.regionalOffice?.id) {
        throw new ForbiddenException('You can only update QR codes for your own regional office');
      }
    }

    // Don't allow updating if already generated? Or maybe just allow it?
    // Let's allow it for now, but usually you shouldn't update account numbers once generated.

    Object.assign(qr, dto);
    await this.qrCodeRepository.save(qr);

    return this.findOne(id);
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

  /**
   * Extracts the account number and 10-digit mobile number from filenames like:
   *   71451121_SPM_PUNB000005618638-918950699901_07-05-2026_12_10_04.pdf
   * The raw number between '-' and '_<date>' includes the country code (91).
   * We strip the leading '91' to get the 10-digit mobile number stored in DB.
   */
  private extractMobileNoFromFilename(filename: string): string | null {
    // Matches the account number before the first underscore, and the mobile number before the date
    const match = filename.match(/^([^_]+).*?-(\d+)_\d{2}-\d{2}-\d{4}/);
    if (!match) return null;
    const rawNumber = match[2]; // e.g. "918950699901"

    // Strip 2-digit country code (91) → "8950699901"
    const mobileNumber = rawNumber.startsWith('91') && rawNumber.length === 12
      ? rawNumber.slice(2)
      : rawNumber;

    return mobileNumber;
  }

  /**
   * Renders a single PDF page to a PNG Buffer using mupdf (WASM, no system deps).
   * Uses dynamic import() because mupdf is an ESM-only module with top-level await.
   */
  private async pdfPageToPng(pdfBuffer: Buffer, pageIndex: number, dpi: number): Promise<Buffer> {
    const mupdf = await import('mupdf');
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    const page = doc.loadPage(pageIndex);
    const scale = dpi / 72;
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(scale, scale),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
    return Buffer.from(pixmap.asPNG());
  }

  /**
   * Crops the source PNG and pastes it onto the template PNG using sharp,
   * then embeds the result into a new PDF using pdf-lib and saves it to disk.
   */
  private async processAndSaveQrPdf(
    sourcePngBuffer: Buffer,
    templatePngPath: string,
    crop: { x: number; y: number; width: number; height: number },
    paste: { x: number; y: number },
    destPdfPath: string,
  ): Promise<void> {
    const sharp = require('sharp');
    const { PDFDocument } = require('pdf-lib');

    // 1. Crop the QR code from the source
    const croppedQr = await sharp(sourcePngBuffer)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .toBuffer();

    // 2. Paste it onto the template
    const finalPngBuffer = await sharp(templatePngPath)
      .composite([{ input: croppedQr, top: paste.y, left: paste.x }])
      .png()
      .toBuffer();

    // 3. Convert to PDF
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(finalPngBuffer);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0 });
    const pdfBytes = await pdfDoc.save();

    // 4. Write to disk
    fs.writeFileSync(destPdfPath, pdfBytes);
  }

  async bulkUploadZip(zipFile: Express.Multer.File): Promise<{
    processed: number;
    updated: string[];
    failed: { filename: string; reason: string }[];
  }> {
    // const totalStart = Date.now();
    // console.log(`[bulkUploadZip] Starting bulk upload process for file: ${zipFile.originalname}`);

    if (!zipFile) {
      throw new BadRequestException('No ZIP file provided');
    }

    // Load image config
    // const configStart = Date.now();
    const configPath = path.join(process.cwd(), 'python', 'image_config.json');
    if (!fs.existsSync(configPath)) {
      throw new BadRequestException('Image config not found at python/image_config.json');
    }
    const cfg: ImageConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const templatePath = path.resolve(cfg.template_path);
    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException(`Template image not found: ${cfg.template_path}`);
    }
    // console.log(`[bulkUploadZip] Config and template check took ${Date.now() - configStart}ms`);

    // const zipStart = Date.now();
    const zip = new AdmZip(zipFile.path);
    const entries = zip.getEntries();
    // console.log(`[bulkUploadZip] ZIP extraction took ${Date.now() - zipStart}ms for ${entries.length} entries`);
    const pdfEntries = entries.filter(e => {
      const name = path.basename(e.entryName);
      return (
        !e.isDirectory &&
        e.entryName.toLowerCase().endsWith('.pdf') &&
        !name.startsWith('._') &&          // macOS resource fork files
        !e.entryName.includes('__MACOSX')  // macOS metadata directory
      );
    });

    const updated: string[] = [];
    const failed: { filename: string; reason: string }[] = [];

    // Helper for chunking array to process concurrently
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunked: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
      }
      return chunked;
    };

    const chunks = chunkArray(pdfEntries, 5); // Process 5 PDFs concurrently

    try {
      for (const chunk of chunks) {
        const batchRecordsToSave: QrCode[] = [];

        await Promise.all(chunk.map(async (entry) => {
          // const entryStart = Date.now();
          const filename = path.basename(entry.entryName);

          // ── Step 1: Extract mobile number from filename ──────────
          const mobileNumber = this.extractMobileNoFromFilename(filename);
          if (!mobileNumber) {
            failed.push({ filename, reason: 'Could not extract mobile number from filename' });
            return;
          }

          try {
            // ── Step 2: DB lookup by mobile number & pending status 
            // const dbLookupStart = Date.now();
            const record = await this.qrCodeRepository.findOne({
              where: {
                mobile_number: mobileNumber,
                status: QrCodeStatus.PENDING_QR_GENERATION
              },
              relations: ['regional_office'],
            });
            // console.log(`[bulkUploadZip] [${filename}] DB lookup took ${Date.now() - dbLookupStart}ms`);

            if (!record) {
              failed.push({ filename, reason: `No pending record found for mobile=${mobileNumber}` });
              return;
            }

            // ── Step 3: Resolve RO-scoped destination folder ─────────────────────
            const roName = record.regional_office?.name
              ? record.regional_office.name.replace(/[^a-zA-Z0-9_-]/g, '_')
              : 'UNKNOWN_RO';
            const destDir = path.join(process.cwd(), 'uploads', 'qr-codes', roName);
            fs.mkdirSync(destDir, { recursive: true });

            // ── Step 4: PDF → PNG via mupdf (pure Node.js, no system deps) ───────
            // const pdfToPngStart = Date.now();
            const pdfBuffer = entry.getData();
            const pngBuffer = await this.pdfPageToPng(pdfBuffer, cfg.page_index ?? 0, cfg.dpi);
            // console.log(`[bulkUploadZip] [${filename}] PDF to PNG conversion took ${Date.now() - pdfToPngStart}ms`);

            // ── Step 5: Process with Sharp and Save to PDF ─────────────────────
            // const processingStart = Date.now();
            const finalName = `${record.account_number}_${mobileNumber}.pdf`;
            const destPdfPath = path.join(destDir, finalName);

            await this.processAndSaveQrPdf(
              pngBuffer,
              templatePath,
              cfg.crop,
              cfg.paste,
              destPdfPath
            );
            // console.log(`[bulkUploadZip] [${filename}] Image processing & PDF save took ${Date.now() - processingStart}ms`);

            // ── Step 6: Prepare DB update ────────────────────────────────────────
            record.qr_pdf_url = destPdfPath;
            record.qr_pdf_filename = finalName;
            record.status = QrCodeStatus.AVAILABLE_FOR_DOWNLOAD;
            batchRecordsToSave.push(record);

            updated.push(filename);
            // console.log(`[bulkUploadZip] [${filename}] Total processing time: ${Date.now() - entryStart}ms`);
          } catch (err: any) {
            failed.push({ filename, reason: err.message });
          }
        }));

        // Batch save database updates
        if (batchRecordsToSave.length > 0) {
          // const dbSaveStart = Date.now();
          await this.qrCodeRepository.save(batchRecordsToSave);
          // console.log(`[bulkUploadZip] Batch DB save for ${batchRecordsToSave.length} records took ${Date.now() - dbSaveStart}ms`);
        }
      }
    } finally {
      // Cleanup uploaded ZIP
      try { fs.unlinkSync(zipFile.path); } catch (_) { }
      // console.log(`[bulkUploadZip] Finished. Total execution time: ${Date.now() - totalStart}ms. Processed: ${pdfEntries.length}, Updated: ${updated.length}, Failed: ${failed.length}`);
    }

    return { processed: pdfEntries.length, updated, failed };
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
