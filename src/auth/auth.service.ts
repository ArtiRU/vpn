import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { StatusType } from '../users/users.type';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        if (user.status !== StatusType.ACTIVE) {
            throw new UnauthorizedException('User account is not active');
        }

        return user;
    }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const user = await this.usersService.create(registerDto);

        return this.generateTokens(user);
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.usersService.update(user.id, { last_login: new Date() });

        return this.generateTokens(user);
    }

    async refreshTokens(user: User): Promise<AuthResponseDto> {
        return this.generateTokens(user);
    }

    private async generateTokens(user: User): Promise<AuthResponseDto> {
        const payload = { email: user.email, sub: user.id, role: user.role };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.secret') || 'default-secret',
            expiresIn: (this.configService.get<string>('jwt.expiresIn') || '15m') as any,
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.refreshSecret') || 'default-refresh-secret',
            expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') || '7d') as any,
        });

        const { password, ...userWithoutPassword } = user;

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
        };
    }

    async validateToken(token: string): Promise<any> {
        try {
            return this.jwtService.verify(token, {
                secret: this.configService.get<string>('jwt.secret') || 'default-secret',
            });
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
