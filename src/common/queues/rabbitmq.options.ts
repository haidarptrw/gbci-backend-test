import { ConfigService } from '@nestjs/config';
import { Transport, RmqOptions } from '@nestjs/microservices';
import { AppConfigService } from '../configs/app-config.service';

export const rabbitMQConfig = (configService: AppConfigService, noAck = false): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [configService.rabbitMqUri],
    queue: 'chat_queue',
    queueOptions: {
      durable: true,
    },
    noAck,
  },
});