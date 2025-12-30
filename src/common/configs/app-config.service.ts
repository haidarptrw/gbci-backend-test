import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppConfigService {
    constructor(private configService: ConfigService) { }

    get jwtSecret(): string {
        return this.configService.getOrThrow<string>('JWT_SECRET');
    }

    get jwtRefreshSecret(): string {
        return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    }

    get jwtResetSecret(): string {
        return this.configService.getOrThrow<string>('JWT_RESET_SECRET');
    }

    get resetPasswordLink(): string {
        return this.configService.getOrThrow<string>('RESET_PASSWORD_LINK');
    }

    get mongoUri(): string {
        const user = this.configService.getOrThrow<string>('MONGO_USER');
        const pass = this.configService.getOrThrow<string>('MONGO_PASSWORD');
        const host = this.configService.getOrThrow<string>('MONGO_HOST');
        const port = this.configService.getOrThrow<number>('MONGO_PORT');
        const db = this.configService.getOrThrow<string>('MONGO_DB');
        const authSource = this.configService.get<string>('MONGO_AUTH_SOURCE', 'admin');

        // Construct: mongodb://user:pass@host:port/db?authSource=admin
        const encodedUser = encodeURIComponent(user);
        const encodedPass = encodeURIComponent(pass);

        return `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${db}?authSource=${authSource}`;
    }

    get rabbitMqUri(): string {
        const user = this.configService.getOrThrow<string>('RABBITMQ_USER');
        const pass = this.configService.getOrThrow<string>('RABBITMQ_PASS');
        const host = this.configService.getOrThrow<string>('RABBITMQ_HOST');
        const port = this.configService.getOrThrow<number>('RABBITMQ_PORT');

        // Construct: amqp://user:pass@host:port
        return `amqp://${user}:${pass}@${host}:${port}`;
    }

    get port() {
        return this.configService.get<number>('PORT', 3000);
    }

    get getConfigService() {
        return this.configService;
    }
}