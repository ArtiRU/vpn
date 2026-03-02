import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { XrayService } from './xray.service';

@ApiTags('Xray Panel Setup')
@Controller('xray/panel')
export class XrayPanelController {
  constructor(private readonly xrayService: XrayService) {}

  @Post('fix-listen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set listen to 0.0.0.0 for all inbounds',
    description:
      'Fixes "cannot assign requested address" when 3x-ui runs in Docker. Call after panel login works. Requires XRAY_PANEL_* in .env.',
  })
  @ApiResponse({ status: 200, description: 'Inbounds updated' })
  @ApiResponse({ status: 503, description: 'Panel unavailable or auth failed' })
  async fixListen() {
    try {
      const result = await this.xrayService.setAllInboundsListen('');
      return {
        success: true,
        message: `Updated listen to 0.0.0.0 for ${result.updated} inbound(s). Restart 3x-ui container: docker restart vpn_3x_ui`,
        updated: result.updated,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      const status = error.response?.status ?? HttpStatus.SERVICE_UNAVAILABLE;
      const message = error.response?.data?.msg ?? error.message ?? 'Failed to fix listen';
      throw new HttpException(message, status);
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Check panel connection and list inbounds' })
  @ApiResponse({ status: 200, description: 'Panel status and inbounds' })
  @ApiResponse({ status: 503, description: 'Panel unavailable' })
  async status() {
    try {
      const inbounds = await this.xrayService.getInbounds();
      const vless = await this.xrayService.findVlessRealityInbound();
      return {
        success: true,
        panelReachable: true,
        inboundsCount: inbounds.length,
        vlessRealityInbound: vless
          ? {
              id: vless.id,
              remark: vless.remark,
              port: vless.port,
              listen: (vless as any).listen ?? '(default)',
            }
          : null,
      };
    } catch (error: any) {
      return {
        success: false,
        panelReachable: false,
        error: error?.message ?? 'Unknown error',
      };
    }
  }
}
