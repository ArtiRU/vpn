import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleType, StatusType } from '../users.type';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
        required: true,
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User password (minimum 6 characters)',
        example: 'Password123!',
        minLength: 6,
        required: true,
    })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({
        description: 'User role',
        enum: RoleType,
        example: RoleType.USER,
        default: RoleType.USER,
        required: false,
    })
    @IsOptional()
    @IsEnum(RoleType)
    role?: RoleType;

    @ApiProperty({
        description: 'User account status',
        enum: StatusType,
        example: StatusType.ACTIVE,
        default: StatusType.ACTIVE,
        required: false,
    })
    @IsOptional()
    @IsEnum(StatusType)
    status?: StatusType;

    @ApiProperty({
        description: 'Whether trial period has been used',
        example: false,
        default: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    trial_used?: boolean;
}
