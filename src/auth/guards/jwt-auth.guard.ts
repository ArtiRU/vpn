import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.log(`Checking JWT auth for ${request.method} ${request.url}`);
    this.logger.log(`Authorization header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error(`JWT Authentication failed`);
      this.logger.error(`Error: ${err?.message || 'No error'}`);
      this.logger.error(`Info: ${info?.message || JSON.stringify(info)}`);
      this.logger.error(`User: ${user ? 'Found' : 'Not found'}`);
      
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    
    this.logger.log(`JWT Authentication successful for user: ${user.email}`);
    return user;
  }
}
