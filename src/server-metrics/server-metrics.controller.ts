import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ServerMetricsService } from './server-metrics.service';
import { CreateServerMetricDto } from './dto/create-server-metric.dto';
import { UpdateServerMetricDto } from './dto/update-server-metric.dto';
import { ServerMetric } from './entities/server-metric.entity';

@ApiTags('Server Metrics')
@Controller('server-metrics')
export class ServerMetricsController {
  constructor(private readonly serverMetricsService: ServerMetricsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new server metric' })
  @ApiResponse({ status: 201, description: 'Metric successfully recorded', type: ServerMetric })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  create(@Body() createServerMetricDto: CreateServerMetricDto) {
    return this.serverMetricsService.create(createServerMetricDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all server metrics' })
  @ApiResponse({ status: 200, description: 'Return all metrics', type: [ServerMetric] })
  @ApiQuery({ name: 'serverId', required: false, description: 'Filter by server ID' })
  findAll(@Query('serverId') serverId?: string) {
    if (serverId) {
      return this.serverMetricsService.findByServerId(Number(serverId));
    }
    return this.serverMetricsService.findAll();
  }

  @Get('server/:serverId/latest')
  @ApiOperation({ summary: 'Get latest metric for a server' })
  @ApiResponse({ status: 200, description: 'Latest metric found', type: ServerMetric })
  @ApiResponse({ status: 404, description: 'No metrics found for this server' })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  findLatest(@Param('serverId', ParseIntPipe) serverId: number) {
    return this.serverMetricsService.findLatestByServerId(serverId);
  }

  @Get('server/:serverId/range')
  @ApiOperation({ summary: 'Get metrics for a server within time range' })
  @ApiResponse({ status: 200, description: 'Metrics found', type: [ServerMetric] })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiQuery({ name: 'start', description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'end', description: 'End date (ISO format)' })
  findByTimeRange(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.serverMetricsService.findByServerIdAndTimeRange(
      serverId,
      new Date(start),
      new Date(end),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get metric by ID' })
  @ApiResponse({ status: 200, description: 'Metric found', type: ServerMetric })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  @ApiParam({ name: 'id', description: 'Metric ID' })
  findOne(@Param('id') id: string) {
    return this.serverMetricsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update metric by ID' })
  @ApiResponse({ status: 200, description: 'Metric successfully updated', type: ServerMetric })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  @ApiParam({ name: 'id', description: 'Metric ID' })
  update(@Param('id') id: string, @Body() updateServerMetricDto: UpdateServerMetricDto) {
    return this.serverMetricsService.update(id, updateServerMetricDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete metric by ID' })
  @ApiResponse({ status: 200, description: 'Metric successfully deleted', type: ServerMetric })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  @ApiParam({ name: 'id', description: 'Metric ID' })
  remove(@Param('id') id: string) {
    return this.serverMetricsService.remove(id);
  }

  @Delete('cleanup/old')
  @ApiOperation({ summary: 'Remove old metrics' })
  @ApiResponse({ status: 200, description: 'Number of removed metrics' })
  @ApiQuery({ name: 'days', required: false, description: 'Days to keep (default: 30)' })
  removeOld(@Query('days') days?: string) {
    const daysToKeep = days ? Number(days) : 30;
    return this.serverMetricsService.removeOlderThan(daysToKeep);
  }
}
