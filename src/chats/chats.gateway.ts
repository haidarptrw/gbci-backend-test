import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as websockets from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from 'src/common/services/token.service';
import { SendMessageDto } from './dto/chat.dto';
import { Effect } from 'effect';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from 'src/common/configs/app-config.service';

@websockets.WebSocketGateway({ cors: { origin: '*' } })
export class ChatsGateway {
  @websockets.WebSocketServer()
  server!: Server;

  constructor(
    @Inject('CHAT_SERVICE') private readonly rmqClient: ClientProxy,
    private readonly tokenService: TokenService,
    private readonly configService: AppConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const program = Effect.tryPromise({
      try: async () => {
        const authHeader = client.handshake.headers.authorization;
        const token = authHeader
          ? authHeader.split(' ')[1]
          : (client.handshake.query.token as string);

        if (!token) {
          console.log('No token provided, disconnecting socket.');
          client.disconnect();
          return;
        }

        const program = this.tokenService.verifyAsync({
          token,
          secret: this.configService.jwtSecret,
        });

        const payload = await Effect.runPromise(program);

        client.data.userId = payload.sub;

        const userRoom = `user_${payload.sub}`;
        client.join(userRoom);

        console.log(`Socket connected: ${client.id} (User: ${payload.sub})`);
      },
      catch: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log('Socket authentication failed:', errorMessage);
        client.disconnect();
      },
    });
    await Effect.runPromise(program);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @websockets.SubscribeMessage('joinChat')
  handleJoinChat(
    @websockets.ConnectedSocket() client: Socket,
    @websockets.MessageBody() chatId: string,
  ): websockets.WsResponse<{ event: string; room: string }> {
    const roomName = `chat_${chatId}`;
    client.join(roomName);
    console.log(`User ${client.data.userId} joined room ${roomName}`);
    return { event: 'joinChat', data: { event: 'joined', room: roomName } };
  }

  @websockets.SubscribeMessage('leaveChat')
  handleLeaveChat(
    @websockets.ConnectedSocket() client: Socket,
    @websockets.MessageBody() chatId: string,
  ) {
    const roomName = `chat_${chatId}`;
    client.leave(roomName);
    return { event: 'left', room: roomName };
  }

  @websockets.SubscribeMessage('sendMessage')
  async handleSendMessage(
    @websockets.ConnectedSocket() client: Socket,
    @websockets.MessageBody() dto: SendMessageDto,
  ) {
    const senderId = client.data.userId;

    const program = Effect.tryPromise({
      try: async (signal) => {
        const payload = { ...dto, senderId, timestamp: new Date() };

        await firstValueFrom(this.rmqClient.emit('chat_processing', payload));

        return { status: 'queued', content: dto.content };
      },
      catch: (e) => new Error('Failed to queue message'),
    });

    return Effect.runPromise(program);
  }
}
