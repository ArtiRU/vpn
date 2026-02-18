import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ServerInfoDto } from './dto/server-info.dto';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';
import { VpnConfigDto } from './dto/vpn-config.dto';

@ApiTags('Client API')
@Controller('client')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('servers')
  @ApiOperation({ summary: 'Get list of available VPN servers' })
  @ApiResponse({
    status: 200,
    description: 'List of available servers',
    type: [ServerInfoDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableServers(): Promise<ServerInfoDto[]> {
    return this.clientService.getAvailableServers();
  }

  @Get('servers/country/:countryCode')
  @ApiOperation({ summary: 'Get servers by country code' })
  @ApiParam({
    name: 'countryCode',
    description: 'Two-letter country code (e.g., US, DE, UK)',
    example: 'DE',
  })
  @ApiResponse({
    status: 200,
    description: 'List of servers in specified country',
    type: [ServerInfoDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getServersByCountry(
    @Param('countryCode') countryCode: string,
  ): Promise<ServerInfoDto[]> {
    return this.clientService.getServersByCountry(countryCode);
  }

  @Get('subscription/status')
  @ApiOperation({ summary: 'Get current user subscription status' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status',
    type: SubscriptionStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptionStatus(
    @GetUser() user: User,
  ): Promise<SubscriptionStatusDto> {
    return this.clientService.getSubscriptionStatus(user.id);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get VPN configuration for specific server' })
  @ApiQuery({
    name: 'server_id',
    description: 'Server ID to get configuration for',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'VPN configuration',
    type: VpnConfigDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'No active subscription or config expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration not found for this server',
  })
  async getVpnConfig(
    @GetUser() user: User,
    @Query('server_id') serverId: number,
  ): Promise<VpnConfigDto> {
    return this.clientService.getVpnConfig(user.id, Number(serverId));
  }

  @Get('configs')
  @ApiOperation({ summary: 'Get all VPN configurations for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user VPN configurations',
    type: [VpnConfigDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No active subscription' })
  async getUserConfigs(@GetUser() user: User): Promise<VpnConfigDto[]> {
    return this.clientService.getUserConfigs(user.id);
  }
}
