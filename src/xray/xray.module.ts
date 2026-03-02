import { Module } from '@nestjs/common';
import { XrayService } from './xray.service';
import { XrayPanelController } from './xray-panel.controller';

@Module({
  controllers: [XrayPanelController],
  providers: [XrayService],
  exports: [XrayService],
})
export class XrayModule {}
