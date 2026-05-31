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
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QuerySecurityAuditDto } from './dto/query-security-audit.dto';
import { extractRequestAuditContext } from '../../common/utils/request-audit-context.util';

const AVATAR_UPLOAD_OPTIONS = {
  limits: { fileSize: 10 * 1024 * 1024 },
};

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

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', AVATAR_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload profile avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded' })
  uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove profile avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  deleteAvatar(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteAvatar(user.id);
  }

  @Get('me/avatar')
  @ApiOperation({ summary: 'Get the authenticated user avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar image stream' })
  async getMyAvatar(@CurrentUser() user: { id: string }): Promise<StreamableFile> {
    const { stream, contentType } = await this.usersService.getAvatarStream(
      user.id,
      user.id,
    );
    return new StreamableFile(stream, {
      type: contentType,
      disposition: 'inline',
    });
  }

  @Get(':userId/avatar')
  @ApiOperation({ summary: 'Get a user avatar (self or linked partner)' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Avatar image stream' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUserAvatar(
    @CurrentUser() user: { id: string },
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<StreamableFile> {
    const { stream, contentType } = await this.usersService.getAvatarStream(
      user.id,
      userId,
    );
    return new StreamableFile(stream, {
      type: contentType,
      disposition: 'inline',
    });
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
