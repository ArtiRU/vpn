import { Module } from '@nestjs/common';
import { XrayService } from './xray.service';

@Module({
  providers: [XrayService],
  exports: [XrayService],
})
export class XrayModule {}
