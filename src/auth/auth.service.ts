import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcrypt";
import { Effect } from "effect";
import { InvalidCredentials, InvalidRefreshToken, TokenGenerationError } from "src/common/errors";
import { LoginDto } from "src/auth/dto/login.dto";
import { RegisterUserDto } from "src/users/dto/register.dto";
import { UsersService } from "src/users/users.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) { }

    register(registerDto: RegisterUserDto) {
        return this.usersService.create(registerDto);
    }

    login(loginDto: LoginDto) {
        return Effect.gen(this, function* () {
            const user = yield* this.usersService.findByUsernameOrEmail(loginDto.emailOrUsername).pipe(
                Effect.catchTag("UserNotFound", () => new InvalidCredentials())
            );

            const isMatch = yield* Effect.tryPromise(() =>
                compare(loginDto.password, user.password)
            );

            if (!isMatch) {
                return yield* new InvalidCredentials();
            }

            const tokens = yield* this.generateTokens(user._id.toString(), user.email);
            yield* this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
            return tokens;
            
        })
    }

    refreshTokens(userId: string, refreshToken: string) {
        return Effect.gen(this, function* () {
            const user = yield* this.usersService.findByIdWithRefreshToken(userId).pipe(
                Effect.catchTag("UserNotFound", () => new InvalidRefreshToken())
            );

            /* Commented. NOTE: This is because there is already middleware that check this. */
            // if (!user.refreshToken) {
            //     return yield* new InvalidRefreshToken();
            // }

            // const isMatch = yield* Effect.tryPromise(() =>
            //     compare(refreshToken, user.refreshToken!)
            // );

            // if (!isMatch) {
            //     return yield* new InvalidRefreshToken();
            // }

            const tokens = yield* this.generateTokens(user._id.toString(), user.email);
            yield* this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
            return tokens;
        });
    }

    private generateTokens(userId: string, email: string) {
        return Effect.tryPromise({
            try: async () => {
                const payload = { sub: userId, email };
                const [accessToken, refreshToken] = await Promise.all([
                    this.jwtService.signAsync(payload, {
                        expiresIn: '15m',
                        secret: process.env.JWT_SECRET
                    }),
                    this.jwtService.signAsync(payload, {
                        expiresIn: '7d',
                        secret: process.env.JWT_REFRESH_SECRET
                    })
                ]);

                return {
                    accessToken,
                    refreshToken,
                    user: { id: userId, email }
                };
            },
            catch: (cause) => new TokenGenerationError({ cause })
        });
    }
}