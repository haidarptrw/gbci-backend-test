import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { TestingModule, Test } from '@nestjs/testing';
import { Model } from 'mongoose';
import { AppModule } from 'src/app.module';
import { AppConfigService } from 'src/common/configs/app-config.service';
import { MailService } from 'src/common/mail/mail.service';
import { rabbitMQConfig } from 'src/common/queues/rabbitmq.options';
import { User } from 'src/users/schema/user.schema';
import request from 'supertest';

describe('Auth E2E Testing (MongoDB Involved)', () => {
  let app: INestApplication;
  let httpServer: any;
  let userModel: Model<User>;

  // Test Data
  const timestamp = Date.now();
  const mockUser = {
    email: `auth_test_${timestamp}@example.com`,
    userName: `auth_user_${timestamp}`,
    password: 'Password123!',
    newPassword: 'NewPassword456!',
  };

  let accessToken: string;
  let refreshToken: string;
  let interceptedResetToken: string;

  const mockMailService = {
    sendForgotPasswordEmail: jest.fn((email, token) => {
      console.log(`[TEST INTERCEPT] Captured token for ${email}: ${token}`);
      interceptedResetToken = token;
      return Promise.resolve(true);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    // We connect this just to ensure that the app is running (not used in this test suite)
    const configService = app.get(AppConfigService);
    app.connectMicroservice<MicroserviceOptions>(rabbitMQConfig(configService));

    await app.startAllMicroservices();
    await app.init();

    httpServer = app.getHttpServer();
    userModel = app.get(getModelToken('User'));
  });

  afterAll(async () => {
    if (userModel) {
      await userModel.deleteOne({ email: mockUser.email });
    }
    await app.close();
  });

  it('/auth/register (POST) - should register a new user', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({
        email: mockUser.email,
        userName: mockUser.userName,
        password: mockUser.password,
      })
      .expect(201);
  });

  it('/auth/login (POST) - should login and return tokens', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        identifier: mockUser.email,
        password: mockUser.password,
      })
      .expect(200);

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
  });

  it('/auth/refresh (POST) - should return new tokens', async () => {
    await new Promise(r => setTimeout(r, 1000));
    
    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .send({})
      .expect(200);

    expect(response.body.accessToken).not.toBe(accessToken);
    accessToken = response.body.accessToken;
  });

  it('/auth/forgot-password (POST) - should send email via MockService', async () => {
    await request(httpServer)
      .post('/auth/forgot-password')
      .send({ email: mockUser.email })
      .expect(200);

    expect(mockMailService.sendForgotPasswordEmail).toHaveBeenCalled();
    
    // Verify we captured the token
    expect(interceptedResetToken).toBeDefined();
    expect(typeof interceptedResetToken).toBe('string');
  });

  it('/auth/reset-password (POST) - should work with intercepted token', async () => {
    await request(httpServer)
      .post('/auth/reset-password')
      .send({
        token: interceptedResetToken,
        newPassword: mockUser.newPassword
      })
      .expect(200);
  });

  it('should login with the NEW password', async () => {
     // Try old password (should fail)
     await request(httpServer)
       .post('/auth/login')
       .send({ identifier: mockUser.email, password: mockUser.password })
       .expect(401);

     // Try new password (should success)
     const res = await request(httpServer)
       .post('/auth/login')
       .send({ identifier: mockUser.email, password: mockUser.newPassword })
       .expect(200);
       
     expect(res.body.accessToken).toBeDefined();
  });
});
