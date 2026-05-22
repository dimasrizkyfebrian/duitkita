import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Repository } from 'typeorm';
import {
  ReportExport,
  ReportExportFormat,
  ReportExportStatus,
} from '../../database/entities/report-export.entity';
import { ExportMessages } from '../../common/constants/export.messages';
import { ReportScope } from './dto/forecast-query.dto';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import { ReportsService } from './reports.service';
import { writeMonthlyReportPdf } from './utils/report-pdf.generator';
import {
  REPORT_EXPORT_STORAGE,
  type ReportExportStorage,
} from './storage/report-export-storage.interface';
import { resolveReportExportStorageDriver } from './storage/report-export-storage.provider';

export type ReportExportView = {
  id: string;
  format: ReportExportFormat;
  year: number;
  month: number;
  scope: string;
  status: ReportExportStatus;
  errorMessage: string | null;
  requestedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  downloadReady: boolean;
  storageDriver: string;
  storageKey: string | null;
};

@Injectable()
export class ReportExportsService {
  private readonly ttlDays: number;
  private readonly storageDriver: string;

  constructor(
    @InjectRepository(ReportExport)
    private readonly exportRepo: Repository<ReportExport>,
    private readonly reportsService: ReportsService,
    private readonly configService: ConfigService,
    @Inject(REPORT_EXPORT_STORAGE)
    private readonly storage: ReportExportStorage,
  ) {
    this.ttlDays = Number(this.configService.get<string>('REPORT_EXPORT_TTL_DAYS', '7'));
    this.storageDriver = resolveReportExportStorageDriver(this.configService);
  }

  async create(userId: string, dto: CreateReportExportDto): Promise<ReportExportView> {
    if (dto.format !== ReportExportFormat.PDF) {
      throw new BadRequestException(ExportMessages.INVALID_FORMAT);
    }

    const row = this.exportRepo.create({
      userId,
      format: ReportExportFormat.PDF,
      year: dto.year,
      month: dto.month,
      scope: dto.scope,
      status: ReportExportStatus.PENDING,
    });
    let saved = await this.exportRepo.save(row);

    saved.status = ReportExportStatus.PROCESSING;
    saved = await this.exportRepo.save(saved);

    const tempPdfPath = join(tmpdir(), `duitkita-export-${saved.id}.pdf`);

    try {
      const reportScope = dto.scope === ReportScope.BOTH ? ReportScope.BOTH : ReportScope.ME;

      const [report, healthScore, forecast] = await Promise.all([
        dto.scope === ReportScope.BOTH
          ? this.reportsService.getCoupleReport(userId, dto.year, dto.month)
          : this.reportsService.getMonthlyReport(userId, dto.year, dto.month),
        this.reportsService
          .getHealthScore(userId, dto.year, dto.month, reportScope)
          .catch(() => null),
        this.reportsService
          .getForecast(userId, dto.year, dto.month, reportScope)
          .catch(() => null),
      ]);

      await writeMonthlyReportPdf(tempPdfPath, {
        year: dto.year,
        month: dto.month,
        scope: dto.scope,
        report,
        healthScore,
        forecast,
      });

      const storageKey = await this.storage.saveFromFile(userId, saved.id, tempPdfPath);

      const completedAt = new Date();
      const expiresAt = new Date(completedAt);
      expiresAt.setDate(expiresAt.getDate() + this.ttlDays);

      saved.status = ReportExportStatus.COMPLETED;
      saved.filePath = storageKey;
      saved.completedAt = completedAt;
      saved.expiresAt = expiresAt;
      saved.errorMessage = undefined;
    } catch (err) {
      saved.status = ReportExportStatus.FAILED;
      saved.errorMessage =
        err instanceof Error ? err.message : 'Failed to generate PDF export';
    } finally {
      await unlink(tempPdfPath).catch(() => undefined);
    }

    const finalRow = await this.exportRepo.save(saved);
    return this.toView(finalRow);
  }

  async list(userId: string): Promise<ReportExportView[]> {
    const rows = await this.exportRepo.find({
      where: { userId },
      order: { requestedAt: 'DESC' },
      take: 50,
    });
    return rows.map((r) => this.toView(r));
  }

  async findOne(userId: string, id: string): Promise<ReportExportView> {
    const row = await this.findOwned(userId, id);
    return this.toView(row);
  }

  async getDownloadStream(userId: string, id: string) {
    const row = await this.findOwned(userId, id);

    if (row.status !== ReportExportStatus.COMPLETED) {
      throw new BadRequestException(ExportMessages.NOT_READY);
    }

    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new GoneException(ExportMessages.EXPIRED);
    }

    if (!row.filePath) {
      throw new NotFoundException(ExportMessages.FILE_MISSING);
    }

    const exists = await this.storage.exists(row.filePath);
    if (!exists) {
      throw new NotFoundException(ExportMessages.FILE_MISSING);
    }

    const fileName = `duitkita-report-${row.year}-${String(row.month).padStart(2, '0')}.pdf`;
    const stream = await this.storage.openReadStream(row.filePath);

    return {
      stream,
      fileName,
    };
  }

  private async findOwned(userId: string, id: string): Promise<ReportExport> {
    const row = await this.exportRepo.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException(ExportMessages.NOT_FOUND);
    }
    return row;
  }

  private toView(row: ReportExport): ReportExportView {
    return {
      id: row.id,
      format: row.format,
      year: row.year,
      month: row.month,
      scope: row.scope,
      status: row.status,
      errorMessage: row.errorMessage ?? null,
      requestedAt: row.requestedAt,
      completedAt: row.completedAt ?? null,
      expiresAt: row.expiresAt ?? null,
      downloadReady:
        row.status === ReportExportStatus.COMPLETED &&
        !!row.filePath &&
        (!row.expiresAt || row.expiresAt >= new Date()),
      storageDriver: this.storageDriver,
      storageKey: row.filePath ?? null,
    };
  }
}
