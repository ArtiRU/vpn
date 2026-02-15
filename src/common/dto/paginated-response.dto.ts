import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items' })
    data: T[];

    @ApiProperty({ description: 'Total number of items', example: 100 })
    total: number;

    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Number of items per page', example: 10 })
    limit: number;

    @ApiProperty({ description: 'Total number of pages', example: 10 })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page', example: true })
    hasNextPage: boolean;

    @ApiProperty({ description: 'Whether there is a previous page', example: false })
    hasPrevPage: boolean;
}
