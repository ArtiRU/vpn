import { Test, TestingModule } from '@nestjs/testing';
import { ServerMetricsController } from './server-metrics.controller';
import { ServerMetricsService } from './server-metrics.service';

describe('ServerMetricsController', () => {
  let controller: ServerMetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerMetricsController],
      providers: [ServerMetricsService],
    }).compile();

    controller = module.get<ServerMetricsController>(ServerMetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
