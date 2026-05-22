import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { extractRequestAuditContext } from '../../common/utils/request-audit-context.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created — returns JWT token and user profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.extractSessionMetadata(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive a JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful — returns JWT token and user profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.extractSessionMetadata(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.extractSessionMetadata(req));
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active and revoked sessions for current user' })
  @ApiResponse({ status: 200, description: 'Session list returned' })
  listSessions(@CurrentUser() user: { id: string }) {
    return this.authService.listSessions(user.id);
  }

  @Delete('sessions/others')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions except current one (optional)' })
  @ApiResponse({ status: 204, description: 'Other sessions revoked' })
  revokeOtherSessions(
    @CurrentUser() user: { id: string; sessionId?: string },
    @Req() req: Request,
  ) {
    return this.authService.revokeOtherSessions(
      user.id,
      user.sessionId,
      this.extractSessionMetadata(req),
    );
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session by id' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  revokeSession(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.authService.revokeSession(user.id, id, this.extractSessionMetadata(req));
  }

  private extractSessionMetadata(req: Request) {
    const { ipAddress, userAgent } = extractRequestAuditContext(req);
    return {
      deviceName: typeof req.headers['x-device-name'] === 'string' ? req.headers['x-device-name'] : null,
      ipAddress,
      userAgent,
    };
  }
}
