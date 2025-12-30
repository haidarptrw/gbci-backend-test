import { TestingModule, Test } from "@nestjs/testing";
import { ChatsController } from "./chats.controller";
import { ChatsGateway } from "./chats.gateway";
import { CHAT_REPO_TOKEN } from "./chats.token";
import { Effect } from "effect";

describe('ChatController', () => {
	let controller: ChatsController;
	let chatRepo: any;
	let gateway: any;

	beforeEach(async () => {
		// Mock the Gateway Server
		const mockServer = {
			to: jest.fn().mockReturnThis(),
			emit: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ChatsController],
			providers: [
				// Mock Gateway
				{
					provide: ChatsGateway,
					useValue: {
						server: mockServer, // Public server property
					},
				},
				// Mock Repository (Effect-based)
				{
					provide: CHAT_REPO_TOKEN,
					useValue: {
						createMessage: jest.fn(),
						findChatById: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ChatsController>(ChatsController);
		chatRepo = module.get(CHAT_REPO_TOKEN);
		gateway = module.get(ChatsGateway);
	});

	it('should save message and broadcast to room', async () => {
		const payload = { chatId: 'chat-1', senderId: 'user-A', content: 'Hi' };
		const context = {
			getChannelRef: () => ({ ack: jest.fn() }),
			getMessage: () => ({}),
		} as any;

		const mockSavedMsg = { _id: 'msg-1', content: 'Hi', sender: { name: 'User A' } };
		const mockChat = { members: ['user-A', 'user-B'] };

		jest.spyOn(chatRepo, 'createMessage').mockReturnValue(Effect.succeed(mockSavedMsg));
		jest.spyOn(chatRepo, 'findChatById').mockReturnValue(Effect.succeed(mockChat));

		await controller.handleChatMessage(payload, context);

		// Is it saved to DB?
		expect(chatRepo.createMessage).toHaveBeenCalledWith('chat-1', 'user-A', 'Hi');

		// Does it broadcasts to Chat Room?
		expect(gateway.server.to).toHaveBeenCalledWith('chat_chat-1');
		expect(gateway.server.emit).toHaveBeenCalledWith('newMessage', mockSavedMsg);

		// Does the notification sent to user B, but not user A?
		expect(gateway.server.to).toHaveBeenCalledWith('user_user-B');
		expect(gateway.server.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
			type: 'MESSAGE_RECEIVED'
		}));
		expect(gateway.server.to).not.toHaveBeenCalledWith('user_user-A');
	})
})