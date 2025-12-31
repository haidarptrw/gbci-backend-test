import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Effect, Exit, Schema } from "effect";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AppConfigService } from "src/common/configs/app-config.service";
import { UserNotFound } from "src/common/errors";
import { AuthenticatedUser, JwtPayloadSchema } from "src/common/types";
import { UsersService } from "src/users/users.service";
import express from 'express';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../../common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private usersService: UsersService, configService: AppConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.jwtSecret,
        });
    }

    async validate(payload: any) {
        const authProgram = Effect.gen(this, function* () {
            const parse = JwtPayloadSchema.safeParse(payload);
            if (!parse.success) {
                return yield* Effect.fail(new UnauthorizedException('Invalid token payload format'));
            }
        
            const userId = parse.data.sub;
            const user = yield* this.usersService.findById(userId);

            if (!user) {
                return yield* Effect.fail(new UnauthorizedException('User no longer exists'));
            }

            return user;
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
                    console.error(`Error Database Error: ${error.originalError}`)
                    throw new InternalServerErrorException('Auth verification failed');
                }
            }

            throw new UnauthorizedException();
        }
    }
}