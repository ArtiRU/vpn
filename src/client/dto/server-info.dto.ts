import { ApiProperty } from '@nestjs/swagger';

export class ServerInfoDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'Frankfurt-01' })
    name: string;

    @ApiProperty({ example: 'DE' })
    country_code: string;

    @ApiProperty({ example: 'Frankfurt' })
    city: string;

    @ApiProperty({ example: 'vpn.example.com' })
    hostname: string;

    @ApiProperty({ example: 51820 })
    port: number;

    @ApiProperty({ example: 'wireguard' })
    protocol: string;

    @ApiProperty({ example: 45 })
    load: number;

    @ApiProperty({ example: 10 })
    priority: number;
}
