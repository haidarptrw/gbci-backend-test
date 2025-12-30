import { Global, Module } from '@nestjs/common';
import { MailService, MAIL_CLIENT_TOKEN } from './mail.service';
import { makeConsoleMailClient, makeNodemailerClient } from './mail.client';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [
        MailService,
        {
            provide: MAIL_CLIENT_TOKEN,
            useFactory: (config: ConfigService) => {
                const env = config.get('NODE_ENV');
                
                if (env === 'production') {
                    return makeNodemailerClient({
                        host: config.getOrThrow('SMTP_HOST'),
                        user: config.getOrThrow('SMTP_USER'),
                        pass: config.getOrThrow('SMTP_PASS'),
                    });
                } else {
                    return makeConsoleMailClient();
                }
            },
            inject: [ConfigService],
        }
    ],
    exports: [MailService],
})
export class MailModule {}