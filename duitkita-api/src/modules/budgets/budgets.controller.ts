import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { MonthQueryDto } from '../../common/dto/month-query.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a monthly budget for a category' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate budget',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, dto);
  }

  @Get('partner')
  @ApiOperation({ summary: "List the partner's budgets for a given month" })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: "Partner's budgets returned" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  findPartnerBudgets(
    @CurrentUser() user: { id: string },
    @Query() query: MonthQueryDto,
  ) {
    return this.budgetsService.findPartnerBudgets(
      user.id,
      query.year,
      query.month,
    );
  }

  @Post('finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalize a month — calculates rollovers for the next month',
  })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({
    status: 200,
    description: 'Month finalized — rollover budgets created',
  })
  @ApiResponse({ status: 400, description: 'Month already finalized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  finalizeMonth(
    @CurrentUser() user: { id: string },
    @Query() query: MonthQueryDto,
  ) {
    return this.budgetsService.finalizeMonth(user.id, query.year, query.month);
  }

  @Get()
  @ApiOperation({
    summary: 'List all budgets for the authenticated user in a given month',
  })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiResponse({ status: 200, description: 'List of budgets returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: { id: string }, @Query() query: MonthQueryDto) {
    return this.budgetsService.findAllByMonth(user.id, query.year, query.month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Budget UUID' })
  @ApiResponse({ status: 200, description: 'Budget returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update the base amount of a budget' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Budget UUID' })
  @ApiResponse({ status: 200, description: 'Budget updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Budget UUID' })
  @ApiResponse({ status: 204, description: 'Budget deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.remove(user.id, id);
  }
}
