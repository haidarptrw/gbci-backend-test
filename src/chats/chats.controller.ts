import { BadRequestException, Body, Controller, Get, Inject, InternalServerErrorException, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CHAT_REPO_TOKEN } from "./chats.token";
import { ChatsGateway } from "./chats.gateway";
import { ChatRepository } from "src/common/effect/services/repositories";
import { Array, Console, Context, Effect, Exit, Schema } from "effect";
import { JwtRefreshGuard } from "src/common/guards/jwt-refresh.guard";
import { CreateChatDto, SendMessageSchema } from "./dto/chat.dto";
import { UserSchema_Effect } from "src/users/schema/user.schema";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { getUserFromReq } from "src/common/utils/parser";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";

@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsGateway: ChatsGateway,
    @Inject(CHAT_REPO_TOKEN) private readonly chatRepo: Context.Tag.Service<ChatRepository>
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new chat or group' })
  async createChat(@Req() req: any, @Body() dto: CreateChatDto) {
    const program = Effect.gen(this, function* () {
      const userId = (yield* getUserFromReq(req))._id.toString();

      const members = Array.filter(
        [userId.toString(), ...(dto.userIds || [dto.userId])],
        (item) => item !== undefined
      )
      const isGroup = !!dto.isGroupChat;


      const repo = yield* ChatRepository;

      // Optional: Check if 1-on-1 chat already exists
      if (!isGroup) {
        const existing = yield* repo.findChatByMembers(members).pipe(
          Effect.catchTag("DatabaseError", () => Effect.succeed(null))
        );
        if (existing) return existing;
      }

      return yield* repo.createChat(members, isGroup, dto.name);
    });

    const runnable = Effect.provideService(program, ChatRepository, this.chatRepo);
    return Effect.runPromise(runnable);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chats for current user' })
  async getUserChats(@Req() req: any) {
    const program = Effect.gen(this, function* () {
      const userId = (yield* getUserFromReq(req))._id.toString();
      const repo = yield* ChatRepository;
      return yield* repo.getUserChats(userId.toString());
    });
    const runnable = Effect.provideService(
      program,
      ChatRepository,
      this.chatRepo
    );
    return Effect.runPromise(runnable);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get message history for a chat' })
  async getChatMessages(@Param('id') chatId: string) {
    const program = Effect.provideService(
      this.chatRepo.getMessagesByChatId(chatId),
      ChatRepository,
      this.chatRepo
    );
    return Effect.runPromise(program);
  }

  /**
   * Handle chat message. this is one of the 
   * consumer of the RabbitMQ
   * @param data 
   * @param context 
   */
  @EventPattern('chat_processing')
  async handleChatMessage(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const parsedData = Effect.gen(function* () {
      const parsedDataRes = SendMessageSchema.safeParse(data);
      if (!parsedDataRes.success) {
        return yield* Effect.fail(new BadRequestException("Invalid message data format"));
      }

      const parsedMessage = parsedDataRes.data;
      return parsedMessage;
    }).pipe(Effect.runSync);

    const exit = await Effect.gen(function* () {
      const repo = yield* ChatRepository;

      const savedMessage = yield* repo.createMessage(parsedData.chatId, parsedData.senderId, parsedData.content);

      const chat = yield* repo.findChatById(parsedData.chatId);

      return { savedMessage, chat };
    })
    .pipe((program) => Effect.provideService(program, ChatRepository, this.chatRepo))
    .pipe(Effect.runPromiseExit)


    if (Exit.isFailure(exit)) {
      console.error("Failed to process chat message:", exit.cause);
      channel.nack(originalMsg);
      return;
    }

    const { savedMessage, chat } = exit.value;

    // Broadcast via Socket.io
    this.chatsGateway.server.to(`chat_${data.chatId}`).emit('newMessage', savedMessage);

    const recipient = chat.members.map(id => id.toString()).filter(id => id !== parsedData.senderId);

    recipient.forEach(recipientId => {
      Effect.gen(this, function* () {
        const senderName = yield* Schema.decodeUnknown(UserSchema_Effect)(savedMessage.sender).pipe(
          Effect.map((user) => user.userName),
          Effect.catchAll(() => Effect.succeed('Anonymous'))
        )
        this.chatsGateway.server.to(`user_${recipientId}`)
        .emit('notification', {
          type: 'MESSAGE_RECEIVED',
          chatId: parsedData.chatId,
          senderName,
          preview: parsedData.content.substring(0, 50)
        })
      }).pipe(Effect.runPromise)
    })

    // Acknowledge RabbitMQ (Remove from queue)
    channel.ack(originalMsg);
  }

}