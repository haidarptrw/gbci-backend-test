import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { MicroserviceOptions } from '@nestjs/microservices';
import { rabbitMQConfig } from './common/queues/rabbitmq.options';
import { AppConfigService } from './common/configs/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = app .get(AppConfigService);
  const port = configService.port;

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  app.use(cookieParser())

  app.connectMicroservice<MicroserviceOptions>(rabbitMQConfig(configService));

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger Docs available at: ${await app.getUrl()}/docs`);
}
bootstrap();
