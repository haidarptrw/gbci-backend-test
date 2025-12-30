import { ClientProxy } from "@nestjs/microservices";
import { ChatsGateway } from "./chats.gateway"
import { TokenService } from "src/common/services/token.service";
import { Test, TestingModule } from "@nestjs/testing";
import * as rxjs from 'rxjs';
import { AppConfigService } from "src/common/configs/app-config.service";
import { Effect } from "effect";

describe('ChatsGateway', () => {
    let gateway: ChatsGateway;
    let rmqClient: ClientProxy;
    let tokenService: TokenService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatsGateway,
                // Mock RabbitMQ client
                {
                    provide: 'CHAT_SERVICE',
                    useValue: {
                        emit: jest.fn(() => rxjs.of('queued')),
                    },
                },
                // Mock TokenService (Effect-based)
                {
                    provide: TokenService,
                    useValue: {
                        verifyAsync: jest.fn(),
                    },
                },
                // Mock Config
                {
                    provide: AppConfigService,
                    useValue: { jwtSecret: 'test-secret' },
                },
            ]
        }).compile();

        gateway = module.get<ChatsGateway>(ChatsGateway);
        rmqClient = module.get<ClientProxy>('CHAT_SERVICE');
        tokenService = module.get<TokenService>(TokenService);
    });

    it('should authenticate and join user room on connection', async () => {
        const mockSocket = {
            handshake: { headers: { authorization: 'Bearer valid_token' } },
            data: {},
            join: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        jest.spyOn(tokenService, 'verifyAsync').mockReturnValue(
            Effect.succeed({ sub: 'user-123' } as any)
        );

        await gateway.handleConnection(mockSocket);
        expect(mockSocket.join).toHaveBeenCalledWith('user_user-123');
        expect(mockSocket.data.userId).toBe('user-123');
    })

    it('should push message to RabbitMQ on sendMessage', async () => {
        const mockSocket = { data: { userId: 'sender-1' } } as any;
        const dto = { chatId: 'chat-1', senderId: 'sender-1', content: 'Hello' };
        const result = await gateway.handleSendMessage(mockSocket, dto);

        // Check if RabbitMQ emit was called with correct payload
        expect(rmqClient.emit).toHaveBeenCalledWith('chat_processing', {
            chatId: 'chat-1',
            content: 'Hello',
            senderId: 'sender-1',
            timestamp: expect.any(Date),
        });

        expect(result).toEqual(expect.objectContaining({ status: 'queued' }));
    })
})