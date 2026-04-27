import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouplesService } from './couples.service';
import { LinkPartnerDto } from './dto/link-partner.dto';

@ApiTags('couples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('couples')
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  @Post('link')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link with a partner by their email address' })
  @ApiResponse({ status: 201, description: 'Couple linked successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or user already linked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Partner email not found' })
  link(@CurrentUser() user: { id: string }, @Body() dto: LinkPartnerDto) {
    return this.couplesService.link(user.id, dto);
  }

  @Get('partner')
  @ApiOperation({ summary: 'Get current partner information' })
  @ApiResponse({ status: 200, description: 'Partner profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner linked' })
  getPartner(@CurrentUser() user: { id: string }) {
    return this.couplesService.getPartner(user.id);
  }

  @Delete('partner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink from current partner' })
  @ApiResponse({ status: 204, description: 'Couple unlinked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No partner to unlink' })
  unlink(@CurrentUser() user: { id: string }) {
    return this.couplesService.unlink(user.id);
  }
}
