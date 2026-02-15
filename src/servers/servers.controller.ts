import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { Server } from './entities/server.entity';

@ApiTags('Servers')
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({ status: 201, description: 'Server successfully created', type: Server })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Server with this hostname and port already exists' })
  create(@Body() createServerDto: CreateServerDto) {
    return this.serversService.create(createServerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all servers' })
  @ApiResponse({ status: 200, description: 'Return all servers', type: [Server] })
  @ApiQuery({ name: 'active', required: false, description: 'Filter only active servers' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country code (e.g., DE, US)' })
  findAll(
    @Query('active') active?: string,
    @Query('country') country?: string,
  ) {
    if (active === 'true') {
      return this.serversService.findActive();
    }
    if (country) {
      return this.serversService.findByCountry(country);
    }
    return this.serversService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  @ApiResponse({ status: 200, description: 'Server found', type: Server })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiParam({ name: 'id', description: 'Server ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serversService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update server by ID' })
  @ApiResponse({ status: 200, description: 'Server successfully updated', type: Server })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiResponse({ status: 409, description: 'Server with this hostname and port already exists' })
  @ApiParam({ name: 'id', description: 'Server ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServerDto: UpdateServerDto,
  ) {
    return this.serversService.update(id, updateServerDto);
  }

  @Patch(':id/load')
  @ApiOperation({ summary: 'Update server load' })
  @ApiResponse({ status: 200, description: 'Server load updated', type: Server })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiParam({ name: 'id', description: 'Server ID' })
  updateLoad(
    @Param('id', ParseIntPipe) id: number,
    @Body('load', ParseIntPipe) load: number,
  ) {
    return this.serversService.updateLoad(id, load);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete server by ID' })
  @ApiResponse({ status: 200, description: 'Server successfully deleted', type: Server })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiParam({ name: 'id', description: 'Server ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serversService.remove(id);
  }
}
