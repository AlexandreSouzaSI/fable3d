import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  // Healthcheck — usado pelo docker-compose e pra testar se a API subiu.
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', app: 'fable', timestamp: new Date().toISOString() };
  }
}
