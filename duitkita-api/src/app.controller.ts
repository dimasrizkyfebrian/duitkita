import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      app: 'DuitKita API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
