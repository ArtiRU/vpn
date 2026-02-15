import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { Config } from '../configs/entities/config.entity';
import { Server } from '../servers/entities/server.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User, Config, Server])],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
