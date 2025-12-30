import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

@Global() // Optional: Makes it available everywhere without importing
@Module({
  imports: [
    // 1. We need ConfigModule because AppConfigService uses ConfigService
    ConfigModule.forRoot({
        isGlobal: true, // Ensures ConfigService is available system-wide
        envFilePath: `.env.${process.env.NODE_ENV || 'development'}`, // Load correct .env
    }), 
  ],
  providers: [AppConfigService],
  exports: [AppConfigService], // 2. EXPORT it so other modules can use it
})
export class AppConfigModule {}