import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
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
    description: 'VLESS connection string or configuration',
    example: 'vless://uuid@hostname:443?type=tcp&security=reality&pbk=xxx...',
    required: true,
  })
  @IsString()
  config_body: string;

  @ApiProperty({
    description: 'Client email/identifier in 3X-UI',
    example: 'user-cd49c385-1708445678',
    required: true,
  })
  @IsString()
  private_key: string;

  @ApiProperty({
    description: 'Xray inbound identifier',
    example: 'xray-1',
    required: true,
  })
  @IsString()
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
