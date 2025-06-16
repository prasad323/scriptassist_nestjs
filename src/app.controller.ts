// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Welcome to TaskFlow API! Visit /api for Swagger docs.',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
