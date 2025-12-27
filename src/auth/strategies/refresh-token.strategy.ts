import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Effect, Exit } from "effect";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload, RefreshUser } from "src/common/types";
import { UsersService } from "src/users/users.service";
import * as bcrypt from 'bcrypt';
import { InvalidRefreshToken } from "src/common/errors";

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private readonly usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.refreshToken;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            secretOrKey: process.env.JWT_REFRESH_SECRET!,
            passReqToCallback: true,
        })
    }
    async validate(req: Request, payload: any): Promise<RefreshUser> {
        const validationProgram = Effect.gen(this, function* () {
            const rawRefreshToken = req.cookies?.refreshToken || req.get('Authorization')?.replace('Bearer', '').trim();

            if (!rawRefreshToken) {
                return yield* Effect.fail(new UnauthorizedException('Refresh token missing'));
            }

            const userId = payload.sub;

            const user = yield* this.usersService.findByIdWithRefreshToken(userId).pipe(
                Effect.catchTag("UserNotFound", () => new InvalidRefreshToken())
            );

            if (!user) {
                return yield* Effect.fail(new UnauthorizedException('User not found'));
            }

            const refreshToken = user.refreshToken;
            if (!refreshToken) {
                return yield* Effect.fail(new UnauthorizedException('Token not found'));
            }

            const isMatch = yield* Effect.tryPromise(() => bcrypt.compare(rawRefreshToken, refreshToken));

            if (!isMatch) {
                return yield* Effect.fail(new UnauthorizedException('Invalid or revoked refresh token'));
            }

            return {
                userId: user._id.toString(),
                email: user.email,
                refreshToken: rawRefreshToken
            };
        });

        const exit = await Effect.runPromiseExit(validationProgram);

        if (Exit.isSuccess(exit)) {
            return exit.value;
        } else {
            const failure = exit.cause;
            if (failure._tag === 'Fail' && failure.error instanceof UnauthorizedException) {
                throw failure.error;
            }
            throw new UnauthorizedException();
        }
    }
}
