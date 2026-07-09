// app.controller.ts
import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect()
  redirectToInterface() {
    return { url: this.appService.getRedirectUrl(), statusCode: 302 };
  }
}
