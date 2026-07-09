import { readFileSync } from 'fs';
import { join } from 'path';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import * as Handlebars from 'handlebars';

@ApiExcludeController()
@Controller('app')
export class WebController {
  private readonly template = Handlebars.compile(
    readFileSync(join(__dirname, 'views', 'index.hbs'), 'utf-8'),
  );

  @Get()
  index(@Res() res: Response): void {
    res.type('html').send(this.template({ title: 'Delivery App - Simulador' }));
  }
}
