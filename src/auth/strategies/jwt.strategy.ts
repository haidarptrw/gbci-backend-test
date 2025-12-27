import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Effect, Exit } from "effect";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserNotFound } from "src/common/errors";
import { AuthenticatedUser } from "src/common/types";
import { UsersService } from "src/users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!,
        });
    }

    async validate(payload: any): Promise<AuthenticatedUser> {
        const authProgram = Effect.gen(this, function* () {
            const userId = payload.sub;
            const user = yield* this.usersService.findById(userId);

            if (!user) {
                return yield* Effect.fail(new UnauthorizedException('User no longer exists'));
            }
            return { userId: user._id.toString(), email: user.email };
        });

        const exit = await Effect.runPromiseExit(authProgram);
        if (Exit.isSuccess(exit)) {
            return exit.value;
        } else {
            const failure = exit.cause;
            if (failure._tag === 'Fail') {
                if (failure.error instanceof UnauthorizedException) {
                    throw failure.error;
                }
                const error = failure.error;
                if (error._tag === 'DatabaseError') {
                    throw new InternalServerErrorException('Auth verification failed');
                }
            }

            throw new UnauthorizedException();
        }   
    }
}