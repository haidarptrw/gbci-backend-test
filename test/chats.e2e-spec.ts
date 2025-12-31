import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { RegisterUserDto } from '../src/users/dto/register.dto';
import { LoginDto } from '../src/auth/dto/login.dto';
import { CreateChatDto } from '../src/chats/dto/chat.dto';
import { rabbitMQConfig } from '../src/common/queues/rabbitmq.options';
import { AppConfigService } from '../src/common/configs/app-config.service';
import { MicroserviceOptions } from '@nestjs/microservices';
import mongoose from 'mongoose';

// Helper to wait for socket events
const waitForEvent = (socket: Socket, event: string) => {
  return new Promise<any>((resolve) => {
    socket.once(event, (data) => resolve(data));
  });
};

describe('Chats E2E Test (Mongodb and RabbitMQ involved)', () => {
  let app: INestApplication;
  let httpServer: any;
  let appUrl: string;

  // Test Data
  let userA: {
    id: string;
    token: string;
    socket?: Socket;
    email: string;
    username: string;
  };
  let userB: {
    id: string;
    token: string;
    socket?: Socket;
    email: string;
    username: string;
  };

  let createdChatId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same config as main.ts
    app.useGlobalPipes(new ValidationPipe());

    // Connect Microservice (RabbitMQ) to consume events in the test app
    const configService = app.get(AppConfigService);
    app.connectMicroservice<MicroserviceOptions>(rabbitMQConfig(configService));

    await app.startAllMicroservices();
    await app.init();

    httpServer = app.getHttpServer();
    await app.listen(0); // Listen on random port
    appUrl = await app.getUrl();

    // Prepare unique emails
    const timestamp = Date.now();
    userA = {
      email: `sender_${timestamp}@test.com`,
      id: '',
      token: '',
      username: `sender_${timestamp}`,
    };
    userB = {
      email: `receiver_${timestamp}@test.com`,
      id: '',
      token: '',
      username: `receiver_${timestamp}`,
    };
  });

  afterAll(async () => {
    // Cleanup sockets
    userA.socket?.disconnect();
    userB.socket?.disconnect();

    const connection = mongoose.connection;
    if (connection.readyState === 1) {
      await connection.dropDatabase();
      await connection.close();
    }

    await app.close();
  });

  // =================================================================
  // 1. SETUP & AUTH
  // =================================================================

  it('should register and login User A (Sender)', async () => {
    // Register
    const regDto: RegisterUserDto = {
      email: userA.email,
      userName: userA.username,
      password: 'password123',
    };
    await request(httpServer).post('/auth/register').send(regDto).expect(201);

    // Login
    const loginDto: LoginDto = {
      identifier: userA.email,
      password: 'password123',
    };
    const res = await request(httpServer)
      .post('/auth/login')
      .send(loginDto)
      .expect(200);

    userA.token = res.body.accessToken;
    userA.id = res.body.user.id;
    expect(userA.token).toBeDefined();
  });

  it('should register and login User B (Receiver)', async () => {
    // Register
    const regDto: RegisterUserDto = {
      email: userB.email,
      userName: userB.username,
      password: 'password123',
    };
    await request(httpServer).post('/auth/register').send(regDto).expect(201);

    // Login
    const loginDto: LoginDto = {
      identifier: userB.email,
      password: 'password123',
    };
    const res = await request(httpServer)
      .post('/auth/login')
      .send(loginDto)
      .expect(200);

    userB.token = res.body.accessToken;
    userB.id = res.body.user.id;
    expect(userB.token).toBeDefined();
  });

  // =================================================================
  // 2. HTTP: CREATE CHAT
  // =================================================================

  it('should create a 1-on-1 chat via HTTP', async () => {
    const createChatDto: CreateChatDto = {
      userId: userB.id,
      isGroupChat: false,
    };

    const res = await request(httpServer)
      .post('/chats')
      .set('Authorization', `Bearer ${userA.token}`)
      .send(createChatDto)
      .expect(201);

    createdChatId = res.body._id;
    expect(createdChatId).toBeDefined();
    expect(res.body.members).toHaveLength(2);
  });

  // =================================================================
  // 3. WEBSOCKET CONNECTION
  // =================================================================

  it('should connect both users to WebSocket Gateway', (done) => {
    const connectSocket = (token: string) => {
      return io(appUrl, {
        extraHeaders: { Authorization: `Bearer ${token}` },
        transports: ['websocket'],
      });
    };

    userA.socket = connectSocket(userA.token);
    userB.socket = connectSocket(userB.token);

    let connectedCount = 0;
    const checkDone = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };

    userA.socket.on('connect', checkDone);
    userB.socket.on('connect', checkDone);
  });

  it('should join the chat room (User A & B)', (done) => {
    // user join via handleJoinChat API in ChatGateway
    let joinedCount = 0;
    const checkDone = () => {
      joinedCount++;
      if (joinedCount === 2) done();
    };

    userA.socket?.on('joinChat', (response) => {
      expect(response.event).toBe('joined');
      checkDone();
    });
    userB.socket?.on('joinChat', (response) => {
      expect(response.event).toBe('joined');
      checkDone();
    });

    userA.socket?.emit('joinChat', createdChatId);
    userB.socket?.emit('joinChat', createdChatId);
  });

  // =================================================================
  // 4. MESSAGING FLOW (The Core Test)
  // =================================================================

  it('should handle full message flow: WS -> RMQ -> DB -> WS Broadcast', async () => {
    const messageContent = 'Hello from RabbitMQ E2E!';

    // 1. Setup Listener for User B (Receiver)
    // We expect to receive 'newMessage' or 'notification' depending on your gateway logic
    // Your controller emits 'newMessage' to `chat_${chatId}` room.
    const receiverPromise = waitForEvent(userB.socket as any, 'newMessage');

    // 2. User A sends message
    userA.socket?.emit('sendMessage', {
      chatId: createdChatId,
      content: messageContent,
      senderId: userA.id, // Ideally senderId is inferred from token on backend, but based on your DTO
    });

    // 3. Await the loop
    // This waits for: A -> Gateway -> RabbitMQ -> Controller -> DB -> Gateway -> B
    const receivedMessage = await receiverPromise;

    // 4. Assertions
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe(messageContent);
    expect(receivedMessage.sender._id).toBe(userA.id); // Assuming populate works
    expect(receivedMessage.chat).toBe(createdChatId);
  }, 10000); // Increased timeout for RMQ latency

  // =================================================================
  // 5. DATA PERSISTENCE
  // =================================================================

  it('should retrieve message history via HTTP', async () => {
    const res = await request(httpServer)
      .get(`/chats/${createdChatId}/messages`)
      .set('Authorization', `Bearer ${userA.token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[res.body.length - 1].content).toBe(
      'Hello from RabbitMQ E2E!',
    );
  });
});
