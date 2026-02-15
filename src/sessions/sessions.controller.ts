import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session successfully created', type: Session })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User, Config or Server not found' })
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiResponse({ status: 200, description: 'Return all sessions', type: [Session] })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'serverId', required: false, description: 'Filter by server ID' })
  findAll(
    @Query('userId') userId?: string,
    @Query('serverId') serverId?: string,
  ) {
    if (userId) {
      return this.sessionsService.findByUserId(userId);
    }
    if (serverId) {
      return this.sessionsService.findByServerId(Number(serverId));
    }
    return this.sessionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session found', type: Session })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session by ID' })
  @ApiResponse({ status: 200, description: 'Session successfully updated', type: Session })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionsService.update(id, updateSessionDto);
  }

  @Patch(':id/disconnect')
  @ApiOperation({ summary: 'Mark session as disconnected' })
  @ApiResponse({ status: 200, description: 'Session disconnected', type: Session })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  disconnect(@Param('id') id: string) {
    return this.sessionsService.disconnect(id);
  }

  @Patch(':id/traffic')
  @ApiOperation({ summary: 'Update session traffic' })
  @ApiResponse({ status: 200, description: 'Session traffic updated', type: Session })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  updateTraffic(
    @Param('id') id: string,
    @Body('bytes_sent', ParseIntPipe) bytesSent: number,
    @Body('bytes_received', ParseIntPipe) bytesReceived: number,
  ) {
    return this.sessionsService.updateTraffic(id, bytesSent, bytesReceived);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete session by ID' })
  @ApiResponse({ status: 200, description: 'Session successfully deleted', type: Session })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
