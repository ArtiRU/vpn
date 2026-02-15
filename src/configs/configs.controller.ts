import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigsService } from './configs.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Config } from './entities/config.entity';

@ApiTags('Configs')
@ApiBearerAuth('JWT-auth')
@Controller('configs')
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new VPN configuration' })
  @ApiResponse({ status: 201, description: 'Config successfully created', type: Config })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User or Server not found' })
  @ApiResponse({ status: 409, description: 'IP address already allocated on this server' })
  create(@Body() createConfigDto: CreateConfigDto) {
    return this.configsService.create(createConfigDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all configurations' })
  @ApiResponse({ status: 200, description: 'Return all configurations', type: [Config] })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'serverId', required: false, description: 'Filter by server ID' })
  findAll(
    @Query('userId') userId?: string,
    @Query('serverId') serverId?: string,
  ) {
    if (userId) {
      return this.configsService.findByUserId(userId);
    }
    if (serverId) {
      return this.configsService.findByServerId(Number(serverId));
    }
    return this.configsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration by ID' })
  @ApiResponse({ status: 200, description: 'Configuration found', type: Config })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  findOne(@Param('id') id: string) {
    return this.configsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update configuration by ID' })
  @ApiResponse({ status: 200, description: 'Configuration successfully updated', type: Config })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiResponse({ status: 409, description: 'IP address already allocated on this server' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  update(@Param('id') id: string, @Body() updateConfigDto: UpdateConfigDto) {
    return this.configsService.update(id, updateConfigDto);
  }

  @Patch(':id/use')
  @ApiOperation({ summary: 'Mark configuration as used (update last_used)' })
  @ApiResponse({ status: 200, description: 'Last used timestamp updated', type: Config })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  updateLastUsed(@Param('id') id: string) {
    return this.configsService.updateLastUsed(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete configuration by ID' })
  @ApiResponse({ status: 200, description: 'Configuration successfully deleted', type: Config })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiParam({ name: 'id', description: 'Configuration ID' })
  remove(@Param('id') id: string) {
    return this.configsService.remove(id);
  }

  @Delete('cleanup/expired')
  @ApiOperation({ summary: 'Remove all expired configurations' })
  @ApiResponse({ status: 200, description: 'Number of removed configurations' })
  removeExpired() {
    return this.configsService.removeExpired();
  }

  @Delete('cleanup/inactive')
  @ApiOperation({ summary: 'Remove inactive configurations' })
  @ApiResponse({ status: 200, description: 'Number of removed configurations' })
  @ApiQuery({ name: 'days', required: false, description: 'Days of inactivity (default: 30)' })
  removeInactive(@Query('days') days?: string) {
    const daysInactive = days ? Number(days) : 30;
    return this.configsService.removeInactive(daysInactive);
  }
}
