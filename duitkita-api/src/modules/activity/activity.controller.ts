import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated activity feed for the couple' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: 'Max records (1–50, default 20)' })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0, description: 'Records to skip (default 0)' })
  @ApiResponse({ status: 200, description: 'Activity feed returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  getFeed(
    @CurrentUser() user: { id: string },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.activityService.getFeed(user.id, limit, offset);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Recent activity feed for the dashboard widget' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 5, description: 'Max records (1–50, default 5)' })
  @ApiResponse({ status: 200, description: 'Recent activity returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  getRecentFeed(
    @CurrentUser() user: { id: string },
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.activityService.getFeed(user.id, limit, 0);
  }
}
