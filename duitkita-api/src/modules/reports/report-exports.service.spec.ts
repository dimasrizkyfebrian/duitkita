import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ReportExport,
  ReportExportFormat,
  ReportExportStatus,
} from '../../database/entities/report-export.entity';
import { ReportExportsService } from './report-exports.service';
import { ReportsService } from './reports.service';
import { ReportScope } from './dto/forecast-query.dto';
import { REPORT_EXPORT_STORAGE } from './storage/report-export-storage.interface';

jest.mock('./utils/report-pdf.generator', () => ({
  writeMonthlyReportPdf: jest.fn().mockResolvedValue(undefined),
}));

describe('ReportExportsService', () => {
  let service: ReportExportsService;

  const exportRepo = {
    create: jest.fn((dto) => ({ id: 'export-1', ...dto })),
    save: jest.fn(async (row) => row),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const reportsService = {
    getMonthlyReport: jest.fn().mockResolvedValue({
      userId: 'user-1',
      userName: 'Test',
      year: 2025,
      month: 5,
      totalBudgeted: 400000,
      totalRollover: 0,
      totalEffectiveBudget: 400000,
      totalSpent: 75000,
      totalRemaining: 325000,
      overallPercentageUsed: 19,
      totalExpenseCount: 2,
      averageExpenseAmount: 37500,
      topExpenses: [],
      categories: [],
      hasAvatar: false,
    }),
    getCoupleReport: jest.fn(),
    getHealthScore: jest.fn().mockResolvedValue({
      score: 72,
      savingRate: 81,
      budgetAdherence: 81,
      expenseVolatility: 12,
      insights: [],
    }),
    getForecast: jest.fn().mockResolvedValue({
      projectedSpent: 90000,
      projectedRemaining: 310000,
      burnRatePerDay: 5000,
      confidenceLevel: 'medium',
      keyDrivers: [],
    }),
  };

  const storage = {
    saveFromFile: jest.fn().mockResolvedValue('user-1/export-1.pdf'),
    openReadStream: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportExportsService,
        { provide: getRepositoryToken(ReportExport), useValue: exportRepo },
        { provide: ReportsService, useValue: reportsService },
        { provide: REPORT_EXPORT_STORAGE, useValue: storage },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'REPORT_EXPORT_TTL_DAYS') return '7';
              if (key === 'REPORT_STORAGE_DRIVER') return 'local';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ReportExportsService);
  });

  it('rejects non-pdf format', async () => {
    await expect(
      service.create('user-1', {
        format: 'csv' as ReportExportFormat,
        year: 2025,
        month: 5,
        scope: ReportScope.ME,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes pdf export job', async () => {
    const result = await service.create('user-1', {
      format: ReportExportFormat.PDF,
      year: 2025,
      month: 5,
      scope: ReportScope.ME,
    });

    expect(result.status).toBe(ReportExportStatus.COMPLETED);
    expect(result.downloadReady).toBe(true);
    expect(result.storageKey).toBe('user-1/export-1.pdf');
    expect(storage.saveFromFile).toHaveBeenCalled();
    expect(reportsService.getMonthlyReport).toHaveBeenCalledWith('user-1', 2025, 5);
  });
});
