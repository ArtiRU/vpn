import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetConfigDto {
    @ApiProperty({ example: 1, description: 'Server ID to get config for' })
    @IsNotEmpty()
    @IsNumber()
    server_id: number;
}
