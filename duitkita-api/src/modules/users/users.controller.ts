import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QuerySecurityAuditDto } from './dto/query-security-audit.dto';
import { extractRequestAuditContext } from '../../common/utils/request-audit-context.util';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user display name' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or wrong current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return this.usersService.changePassword(user.id, dto, extractRequestAuditContext(req));
  }

  @Get('me/security-audit')
  @ApiOperation({ summary: 'Paginated security audit log for the current user' })
  @ApiResponse({ status: 200, description: 'Audit entries returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSecurityAudit(
    @CurrentUser() user: { id: string },
    @Query() query: QuerySecurityAuditDto,
  ) {
    return this.usersService.getSecurityAuditLog(user.id, query.limit, query.offset);
  }
}
