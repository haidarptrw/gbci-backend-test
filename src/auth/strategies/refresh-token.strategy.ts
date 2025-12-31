import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Effect, Exit } from 'effect';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { InvalidRefreshToken } from 'src/common/errors';
import { AppConfigService } from 'src/common/configs/app-config.service';
import { JwtPayloadSchema } from 'src/common/types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly usersService: UsersService,
    configService: AppConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.refreshToken;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: configService.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: any) {
    const validationProgram = Effect.gen(this, function* () {
      const parse = JwtPayloadSchema.safeParse(payload);
      if (!parse.success) {
        return yield* Effect.fail(
          new UnauthorizedException('Invalid token payload format'),
        );
      }

      const userId = parse.data.sub;

      const user = yield* this.usersService
        .findByIdWithRefreshToken(userId)
        .pipe(Effect.catchTag('UserNotFound', () => new InvalidRefreshToken()));

      if (!user) {
        return yield* Effect.fail(new UnauthorizedException('User not found'));
      }

      return user;
    });

    const exit = await Effect.runPromiseExit(validationProgram);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    } else {
      const failure = exit.cause;
      if (
        failure._tag === 'Fail' &&
        failure.error instanceof UnauthorizedException
      ) {
        throw failure.error;
      }
      throw new UnauthorizedException();
    }
  }
}
