import { ApiProperty } from '@nestjs/swagger';
import { RoleType, StatusType } from '../users.type';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
    @Expose()
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'user@example.com' })
    email: string;

    @Expose()
    @ApiProperty({ enum: RoleType, example: RoleType.USER })
    role: RoleType;

    @Expose()
    @ApiProperty({ enum: StatusType, example: StatusType.ACTIVE })
    status: StatusType;

    @Expose()
    @ApiProperty({ example: false })
    trial_used: boolean;

    @Expose()
    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    created_at: Date;

    @Expose()
    @ApiProperty({ example: '2024-02-12T18:30:00.000Z', nullable: true })
    last_login: Date;
}
