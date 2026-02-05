import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  uid: string;
  email?: string;
  role?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
