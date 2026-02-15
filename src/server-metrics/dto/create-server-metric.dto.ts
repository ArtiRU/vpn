import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsDateString, Min, Max } from 'class-validator';

export class CreateServerMetricDto {
    @ApiProperty({
        description: 'Server ID',
        example: 1,
        required: true,
    })
    @IsInt()
    server_id: number;

    @ApiProperty({
        description: 'CPU usage percentage',
        example: 45.5,
        required: true,
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    cpu_usage: number;

    @ApiProperty({
        description: 'Memory usage percentage',
        example: 67.8,
        required: true,
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    mem_usage: number;

    @ApiProperty({
        description: 'Number of active connections',
        example: 150,
        required: true,
    })
    @IsInt()
    @Min(0)
    active_connections: number;

    @ApiProperty({
        description: 'Metric recording time',
        example: '2024-02-12T18:30:00.000Z',
        required: true,
    })
    @IsDateString()
    recorded_at: Date;
}
