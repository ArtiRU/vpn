import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
  IsIP,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateConfigDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Server ID',
    example: 1,
    required: true,
  })
  @IsInt()
  server_id: number;

  @ApiProperty({
    description: 'VPN configuration body (WireGuard .conf, VLESS link, etc.)',
    example: '[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n...',
    required: true,
  })
  @IsString()
  config_body: string;

  @ApiProperty({
    description: 'Encrypted private key',
    example: 'encrypted_private_key_here...',
    required: true,
  })
  @IsString()
  private_key: string;

  @ApiProperty({
    description: 'Allocated IP address in the tunnel',
    example: '10.0.0.2',
    required: true,
  })
  @IsIP()
  allocated_ip: string;

  @ApiProperty({
    description: 'Configuration expiration date',
    example: '2025-02-12T18:30:00.000Z',
    required: true,
  })
  @IsDateString()
  expires_at: Date;

  @ApiProperty({
    description: 'Last time configuration was used',
    example: '2024-02-12T18:30:00.000Z',
    required: true,
  })
  @IsDateString()
  last_used: Date;
}
