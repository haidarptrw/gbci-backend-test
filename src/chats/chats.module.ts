import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { rabbitMQConfig } from "src/common/queues/rabbitmq.options";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Message, MessageSchema } from "./schema/message.schema";
import { Chat, ChatSchema } from "./schema/chat.schema";
import { CHAT_REPO_TOKEN } from "./chats.token";
import { Model } from "mongoose";
import { createMongoChatRepository } from "./chats.repository";
import { ChatsGateway } from "./chats.gateway";
import { AppConfigService } from "src/common/configs/app-config.service";
import { AppConfigModule } from "src/common/configs/app-config.module";
import { AuthModule } from "src/auth/auth.module";

@Module({
    imports: [
        AppConfigModule, 
        AuthModule,
        MongooseModule.forFeature([
            { name: Chat.name, schema: ChatSchema },
            { name: Message.name, schema: MessageSchema }
        ]),
        ClientsModule.registerAsync([
            {
                name: 'CHAT_SERVICE',
                imports: [AppConfigModule],
                inject: [AppConfigService],
                useFactory: (config: AppConfigService) => {
                    const options =  rabbitMQConfig(config, true);
                    return options;
                },
            }
        ])
    ],
    controllers: [ChatsController],
    providers: [
        ChatsGateway,
        ChatsService,
        {
            provide: CHAT_REPO_TOKEN,
            useFactory: (chatModel: Model<Chat>, msgModel: Model<Message>) => {
                return createMongoChatRepository(chatModel, msgModel);
            },
            inject: [getModelToken(Chat.name), getModelToken(Message.name)],
        }
    ],
    exports: [ChatsService]
})
export class ChatsModule { 

}