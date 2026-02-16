import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WireguardService } from './wireguard.service';

describe('WireguardService', () => {
  let service: WireguardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WireguardService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'WIREGUARD_API_URL') return 'http://localhost:8080';
              if (key === 'WIREGUARD_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WireguardService>(WireguardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create server API URL', () => {
    const url = service.createServerApiUrl('192.168.1.1', 8080);
    expect(url).toBe('http://192.168.1.1:8080');
  });
});
