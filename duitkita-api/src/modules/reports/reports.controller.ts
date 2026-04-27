import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
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

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly spending summary — budgets vs actual spend per category' })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Monthly report returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMonthlyReport(
    @CurrentUser() user: { id: string },
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.reportsService.getMonthlyReport(user.id, year, month);
  }

  @Get('couple')
  @ApiOperation({ summary: 'Combined monthly report for both partners side-by-side' })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'Couple report returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  getCoupleReport(
    @CurrentUser() user: { id: string },
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.reportsService.getCoupleReport(user.id, year, month);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Total spending trend over the past N months' })
  @ApiQuery({ name: 'monthsBack', type: Number, required: false, example: 6, description: 'Number of months to look back (default 6)' })
  @ApiResponse({ status: 200, description: 'Spending trend data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSpendingTrend(
    @CurrentUser() user: { id: string },
    @Query('monthsBack', new DefaultValuePipe(6), ParseIntPipe) monthsBack: number,
  ) {
    return this.reportsService.getSpendingTrend(user.id, monthsBack);
  }

  @Get('trend/category')
  @ApiOperation({ summary: 'Per-category spending trend over the past N months' })
  @ApiQuery({ name: 'monthsBack', type: Number, required: false, example: 6, description: 'Number of months to look back (default 6)' })
  @ApiResponse({ status: 200, description: 'Category trend data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCategoryTrend(
    @CurrentUser() user: { id: string },
    @Query('monthsBack', new DefaultValuePipe(6), ParseIntPipe) monthsBack: number,
  ) {
    return this.reportsService.getCategoryTrend(user.id, monthsBack);
  }

  @Get('rollover/:categoryId')
  @ApiOperation({ summary: 'Rollover history for a specific category over the past N months' })
  @ApiParam({ name: 'categoryId', format: 'uuid', description: 'Category UUID' })
  @ApiQuery({ name: 'monthsBack', type: Number, required: false, example: 6, description: 'Number of months to look back (default 6)' })
  @ApiResponse({ status: 200, description: 'Rollover history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  getRolloverHistory(
    @CurrentUser() user: { id: string },
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('monthsBack', new DefaultValuePipe(6), ParseIntPipe) monthsBack: number,
  ) {
    return this.reportsService.getRolloverHistory(user.id, categoryId, monthsBack);
  }
}
