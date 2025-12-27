import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "src/users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        PassportModule,
        UsersModule,
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
    providers: [AuthService, JwtStrategy, RefreshTokenStrategy],
    exports: [AuthService]
})
export class AuthModule {}