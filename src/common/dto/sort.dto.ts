import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class SortDto {
    @ApiProperty({
        description: 'Field to sort by',
        example: 'created_at',
        required: false,
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({
        description: 'Sort order',
        enum: SortOrder,
        example: SortOrder.DESC,
        default: SortOrder.DESC,
        required: false,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;
}
