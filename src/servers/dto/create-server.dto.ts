import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ProtocolType } from '../servers.type';

export class CreateServerDto {
  @ApiProperty({
    description: 'Server name',
    example: 'Frankfurt-01',
    required: true,
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'DE',
    required: true,
  })
  @IsString()
  @Length(2, 2)
  country_code: string;

  @ApiProperty({
    description: 'City name',
    example: 'Frankfurt',
    required: true,
  })
  @IsString()
  @Length(1, 255)
  city: string;

  @ApiProperty({
    description: 'Server hostname (IP or domain)',
    example: 'vpn.example.com',
    required: true,
  })
  @IsString()
  @Length(1, 255)
  hostname: string;

  @ApiProperty({
    description: 'Server port',
    example: 51820,
    required: true,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({
    description: 'VPN protocol',
    enum: ProtocolType,
    example: ProtocolType.WIREGUARD,
    required: true,
  })
  @IsEnum(ProtocolType)
  protocol: ProtocolType;

  @ApiProperty({
    description: 'Public key (for WireGuard)',
    example: 'public_key_here...',
    required: false,
  })
  @IsOptional()
  @IsString()
  public_key?: string;

  @ApiProperty({
    description: 'Is server active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Server priority for load balancing',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiProperty({
    description: 'Current server load (%)',
    example: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  load?: number;
}
