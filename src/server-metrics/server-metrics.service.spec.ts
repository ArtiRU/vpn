import { Test, TestingModule } from '@nestjs/testing';
import { ServerMetricsService } from './server-metrics.service';

describe('ServerMetricsService', () => {
  let service: ServerMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerMetricsService],
    }).compile();

    service = module.get<ServerMetricsService>(ServerMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
