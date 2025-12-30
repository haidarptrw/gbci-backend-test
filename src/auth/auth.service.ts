import { Injectable } from "@nestjs/common";
import { compare } from "bcrypt";
import { Effect, Option } from "effect";
import { InvalidCredentials, InvalidRefreshToken, InvalidResetToken } from "src/common/errors";
import { LoginDto } from "src/auth/dto/login.dto";
import { RegisterUserDto } from "src/users/dto/register.dto";
import { UsersService } from "src/users/users.service";
import { AppConfigService } from "src/common/configs/app-config.service";
import { TokenService } from "../common/services/token.service";
import { MailService } from "src/common/mail/mail.service";
import { TokenPayload } from "./dto/token.dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly tokenService: TokenService,
        private readonly configService: AppConfigService,
        private readonly mailService: MailService,
    ) { }

    register(registerDto: RegisterUserDto) {
        return this.usersService.create(registerDto);
    }

    login(loginDto: LoginDto) {
        return Effect.gen(this, function* () {
            const user = yield* this.usersService.findByUsernameOrEmail(loginDto.identifier).pipe(
                Effect.catchTag("UserNotFound", () => new InvalidCredentials())
            );

            const isMatch = yield* Effect.tryPromise(() =>
                compare(loginDto.password, user.password)
            );

            if (!isMatch) {
                return yield* new InvalidCredentials();
            }

            const tokens = yield* this.generateTokens(user._id.toString());
            yield* this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
            return tokens;

        })
    }

    refreshTokens(userId: string, refreshToken: string) {
        return Effect.gen(this, function* () {
            const user = yield* this.usersService.findByIdWithRefreshToken(userId).pipe(
                Effect.catchTag("UserNotFound", () => new InvalidRefreshToken())
            );

            if (!user.refreshToken) {
                return yield* new InvalidRefreshToken();
            }

            const userOriginalToken = yield* Effect.fromNullable(user.refreshToken).pipe(
                Effect.mapError(() => new InvalidRefreshToken())
            );


            const isMatch = yield* Effect.tryPromise(() =>
                compare(refreshToken, userOriginalToken)
            );

            if (!isMatch) {
                return yield* new InvalidRefreshToken();
            }

            const tokens = yield* this.generateTokens(user._id.toString());
            yield* this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
            return tokens;
        });
    }

    forgotPassword(email: string) {
        return Effect.gen(this, function* () {
            const user = yield* this.usersService.findByEmail(email).pipe(
                // Return success for security
                Effect.catchTag("UserNotFound", () => Effect.succeed(null))
            );

            if (!user) {
                return { message: "If the email exists, a reset link has been sent." };
            }

            const resetToken = yield* this.tokenService.signAsync({
                payload: { sub: user._id.toString()},
                secret: this.configService.jwtResetSecret,
                expiresIn: '1h'
            });

            yield* this.mailService.sendForgotPasswordEmail(user.email, resetToken);
            return { message: "If the email exists, a reset link has been sent." };
        })
    }

    resetPassword(token: string, newPassword: string) {
        return Effect.gen(this, function* () {
            const payload = yield* this.tokenService.verifyAsync({
                token, secret:
                    this.configService.jwtResetSecret
            }).pipe(
                Effect.catchAll((_) => new InvalidResetToken())
            )

            const userId = payload.sub;
            yield* this.usersService.updatePassword(userId, newPassword);

            return { message: "Password updated successfully" };
        });
    }

    private generateTokens(userId: string) {
        return Effect.gen(this, function* () {
            const payload = { sub: userId};
            const [accessToken, refreshToken] = yield* Effect.all([
                this.tokenService.signAsync(
                    {
                        payload,
                        secret: this.configService.jwtSecret,
                        expiresIn: '1h'
                    }
                ),
                this.tokenService.signAsync(
                    {
                        payload,
                        secret: this.configService.jwtRefreshSecret,
                        expiresIn: '7d'
                    }
                )
            ]);

            const tokens: TokenPayload = {
                accessToken,
                refreshToken,
                user: { id: userId }
            }
            return tokens;
        });
    }
}