import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ReportExportsService } from './report-exports.service';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import {
  MonthQueryDto,
  MonthsBackQueryDto,
} from '../../common/dto/month-query.dto';
import {
  ForecastQueryDto,
  HealthScoreQueryDto,
} from './dto/forecast-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportsService: ReportExportsService,
  ) {}

  @Get('monthly')
  @ApiOperation({
    summary: 'Monthly spending summary — budgets vs actual spend per category',
  })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Monthly report returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMonthlyReport(
    @CurrentUser() user: { id: string },
    @Query() query: MonthQueryDto,
  ) {
    return this.reportsService.getMonthlyReport(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get('couple')
  @ApiOperation({
    summary: 'Combined monthly report for both partners side-by-side',
  })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Couple report returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  getCoupleReport(
    @CurrentUser() user: { id: string },
    @Query() query: MonthQueryDto,
  ) {
    return this.reportsService.getCoupleReport(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get('trend')
  @ApiOperation({ summary: 'Total spending trend over the past N months' })
  @ApiQuery({
    name: 'monthsBack',
    type: Number,
    required: false,
    example: 6,
    description: 'Number of months to look back (default 6)',
  })
  @ApiResponse({ status: 200, description: 'Spending trend data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSpendingTrend(
    @CurrentUser() user: { id: string },
    @Query() query: MonthsBackQueryDto,
  ) {
    return this.reportsService.getSpendingTrend(user.id, query.monthsBack);
  }

  @Get('trend/category')
  @ApiOperation({
    summary: 'Per-category spending trend over the past N months',
  })
  @ApiQuery({
    name: 'monthsBack',
    type: Number,
    required: false,
    example: 6,
    description: 'Number of months to look back (default 6)',
  })
  @ApiResponse({ status: 200, description: 'Category trend data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCategoryTrend(
    @CurrentUser() user: { id: string },
    @Query() query: MonthsBackQueryDto,
  ) {
    return this.reportsService.getCategoryTrend(user.id, query.monthsBack);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Projected spending for a month' })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 5 })
  @ApiQuery({ name: 'scope', enum: ['me', 'partner', 'both'], required: false })
  @ApiResponse({ status: 200, description: 'Forecast returned' })
  getForecast(
    @CurrentUser() user: { id: string },
    @Query() query: ForecastQueryDto,
  ) {
    return this.reportsService.getForecast(
      user.id,
      query.year,
      query.month,
      query.scope,
    );
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Financial health score for a month' })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 5 })
  @ApiQuery({ name: 'scope', enum: ['me', 'both'], required: false })
  @ApiResponse({ status: 200, description: 'Health score returned' })
  getHealthScore(
    @CurrentUser() user: { id: string },
    @Query() query: HealthScoreQueryDto,
  ) {
    return this.reportsService.getHealthScore(
      user.id,
      query.year,
      query.month,
      query.scope,
    );
  }

  @Post('exports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a PDF monthly report export' })
  @ApiResponse({ status: 201, description: 'Export job created and processed' })
  createExport(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReportExportDto,
  ) {
    return this.reportExportsService.create(user.id, dto);
  }

  @Get('exports')
  @ApiOperation({ summary: 'List report export jobs for current user' })
  listExports(@CurrentUser() user: { id: string }) {
    return this.reportExportsService.list(user.id);
  }

  @Get('exports/:id/download')
  @ApiOperation({ summary: 'Download a completed PDF export' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'PDF file stream' })
  async downloadExport(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { stream, fileName } = await this.reportExportsService.getDownloadStream(
      user.id,
      id,
    );
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('exports/:id')
  @ApiOperation({ summary: 'Get report export job status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  getExport(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportExportsService.findOne(user.id, id);
  }

  @Get('rollover/:categoryId')
  @ApiOperation({
    summary: 'Rollover history for a specific category over the past N months',
  })
  @ApiParam({
    name: 'categoryId',
    format: 'uuid',
    description: 'Category UUID',
  })
  @ApiQuery({
    name: 'monthsBack',
    type: Number,
    required: false,
    example: 6,
    description: 'Number of months to look back (default 6)',
  })
  @ApiResponse({ status: 200, description: 'Rollover history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  getRolloverHistory(
    @CurrentUser() user: { id: string },
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: MonthsBackQueryDto,
  ) {
    return this.reportsService.getRolloverHistory(
      user.id,
      categoryId,
      query.monthsBack,
    );
  }
}
