import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Cliente } from '../../database/entities/cliente.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Cliente => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: Cliente }>();
    return request.user;
  },
);
