import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceDetectorMiddleware } from './common/middlewares/device-detector.middleware';
import { ProfileModule } from './users/profile/profile.module';
import { ChatsModule } from './chats/chats.module';
import { MailModule } from './common/mail/mail.module';
import { AppConfigService } from './common/configs/app-config.service';
import { AppConfigModule } from './common/configs/app-config.module';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => ({
        uri: configService.mongoUri,
      }),
    }),
    AuthModule,
    UsersModule,
    ProfileModule,
    ChatsModule,
    MailModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DeviceDetectorMiddleware)
      .forRoutes("*");
  }
}
