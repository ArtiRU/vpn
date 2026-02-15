import { ApiProperty } from '@nestjs/swagger';

export class VpnConfigDto {
    @ApiProperty({ example: '1', description: 'Config ID' })
    id: string;

    @ApiProperty({ example: '[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n...', description: 'VPN configuration file content' })
    config_body: string;

    @ApiProperty({ example: '10.0.0.2', description: 'Allocated IP address' })
    allocated_ip: string;

    @ApiProperty({ example: '2025-02-12T18:30:00.000Z', description: 'Configuration expiration date' })
    expires_at: Date;

    @ApiProperty({ example: 'Frankfurt-01', description: 'Server name' })
    server_name: string;

    @ApiProperty({ example: 'DE', description: 'Server country code' })
    server_country: string;

    @ApiProperty({ example: 'vpn.example.com', description: 'Server hostname' })
    server_hostname: string;

    @ApiProperty({ example: 51820, description: 'Server port' })
    server_port: number;
}
