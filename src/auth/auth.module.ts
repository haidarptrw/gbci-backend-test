import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "src/users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TokenService } from "../common/services/token.service";
import { AppConfigService } from "src/common/configs/app-config.service";
import { MailModule } from "src/common/mail/mail.module";

@Module({
    imports: [
        PassportModule,
        UsersModule,
        MailModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({ 
                secret: configService.get<string>('JWT_SECRET')!,
                signOptions: { expiresIn: '30d' },
            }),
        })
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        JwtStrategy, 
        RefreshTokenStrategy, 
        TokenService,
        AppConfigService
    ],
    exports: [AuthService, TokenService]
})
export class AuthModule { }