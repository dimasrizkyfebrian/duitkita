import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new expense' })
  @ApiResponse({ status: 201, description: 'Expense created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no active budget for the category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category or budget not found' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.id, dto);
  }

  @Get('by-budget/:budgetId')
  @ApiOperation({ summary: 'List all expenses linked to a specific budget' })
  @ApiParam({ name: 'budgetId', format: 'uuid', description: 'Budget UUID' })
  @ApiResponse({ status: 200, description: 'List of expenses returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  findByBudget(
    @CurrentUser() user: { id: string },
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
  ) {
    return this.expensesService.findAllByBudget(user.id, budgetId);
  }

  @Get('partner')
  @ApiOperation({ summary: "List the partner's expenses for a given month" })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    format: 'uuid',
    description: 'Filter by category',
  })
  @ApiResponse({ status: 200, description: "Partner's expenses returned" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  findPartnerExpenses(
    @CurrentUser() user: { id: string },
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findPartnerExpenses(
      user.id,
      query.year,
      query.month,
      query.categoryId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List all expenses for the authenticated user in a given month',
  })
  @ApiQuery({ name: 'year', type: Number, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, example: 8 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    format: 'uuid',
    description: 'Filter by category',
  })
  @ApiResponse({ status: 200, description: 'List of expenses returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findAllByMonth(
      user.id,
      query.year,
      query.month,
      query.categoryId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single expense by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Expense UUID' })
  @ApiResponse({ status: 200, description: 'Expense returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense amount, note, or date' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Expense UUID' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Expense UUID' })
  @ApiResponse({ status: 204, description: 'Expense deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.remove(user.id, id);
  }
}
