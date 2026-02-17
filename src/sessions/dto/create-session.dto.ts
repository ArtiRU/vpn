import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
  IsIP,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Config ID',
    example: '1',
    required: true,
  })
  @IsString()
  config_id: string;

  @ApiProperty({
    description: 'Server ID',
    example: 1,
    required: true,
  })
  @IsInt()
  server_id: number;

  @ApiProperty({
    description: 'Client real IP address',
    example: '192.168.1.100',
    required: true,
  })
  @IsIP()
  client_ip: string;

  @ApiProperty({
    description: 'Connection start time',
    example: '2024-02-12T18:30:00.000Z',
    required: true,
  })
  @IsDateString()
  connected_at: Date;

  @ApiProperty({
    description: 'Disconnection time',
    example: '2024-02-12T20:30:00.000Z',
    required: true,
  })
  @IsDateString()
  disconnected_at: Date;

  @ApiProperty({
    description: 'Bytes sent',
    example: 1048576,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bytes_sent?: number;

  @ApiProperty({
    description: 'Bytes received',
    example: 2097152,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bytes_received?: number;
}
