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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { QueryRemindersDto } from './dto/query-reminders.dto';
import { SnoozeReminderDto } from './dto/snooze-reminder.dto';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a bill reminder' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bill reminders' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'overdue', 'done'] })
  findAll(@CurrentUser() user: { id: string }, @Query() query: QueryRemindersDto) {
    return this.remindersService.findAll(user.id, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill reminder' })
  @ApiParam({ name: 'id', format: 'uuid' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.remindersService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bill reminder' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(user.id, id, dto);
  }

  @Post(':id/mark-done')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark reminder as done' })
  markDone(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.remindersService.markDone(user.id, id);
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Snooze a reminder' })
  snooze(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SnoozeReminderDto,
  ) {
    return this.remindersService.snooze(user.id, id, dto.snoozeDays ?? 3);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bill reminder' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.remindersService.remove(user.id, id);
  }
}
