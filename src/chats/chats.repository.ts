import { Context, Effect } from "effect";
import { Model, Types } from "mongoose";
import { ChatRepository } from "src/common/effect/services/repositories";
import { Chat } from "./schema/chat.schema";
import { Message } from "./schema/message.schema";
import { DatabaseError } from "src/common/errors";

export const createMongoChatRepository = (
    chatModel: Model<Chat>,
    messageModel: Model<Message>
): Context.Tag.Service<ChatRepository> => ({
    createChat(members, isGroup, name) {
        return Effect.tryPromise({
            try(_) {
                return new chatModel({
                    members: members.map(id => new Types.ObjectId(id)),
                    isGroupChat: isGroup,
                    name
                }).save();
            },
            catch(error) {
                return new DatabaseError({ message: "Create chat failed", originalError: error });
            },
        });
    },
    findChatByMembers: function (members: string[]): Effect.Effect<Chat | null, DatabaseError> {
        return Effect.tryPromise({
            try(_) {
                return chatModel.findOne({
                    isGroupChat: false,
                    $and: [
                        { members: { $elemMatch: { $eq: new Types.ObjectId(members[0]) } } },
                        { members: { $elemMatch: { $eq: new Types.ObjectId(members[1]) } } }
                    ]
                }).populate("members", "-password").lean().exec()
            },
            catch(error) {
                return new DatabaseError({ message: "Find chat failed", originalError: error })
            },
        })
    },
    getUserChats: function (userId: string): Effect.Effect<Chat[], DatabaseError> {
        return Effect.tryPromise({
            try(_) {
                return chatModel.find({
                    members: { $elemMatch: { $eq: new Types.ObjectId(userId) } }
                })
                    .populate("members", "-password")
                    .populate("latestMessage")
                    .sort({ updatedAt: -1 })
                    .lean()
                    .exec();
            },
            catch(error) {
                return new DatabaseError({ message: "Get chats failed", originalError: error });
            },
        })
    },
    findChatById: function (chatId: string): Effect.Effect<Chat, DatabaseError> {
        return Effect.tryPromise({
            async try(_) {
                const chat = await chatModel.findById(chatId)
                    .select('members')
                    .populate("latestMessage")
                    .lean().exec();
                if (!chat) throw new Error("Chat not found"); // Handled by service or generic error
                return chat;
            },
            catch(error) {
                return new DatabaseError({ message: "Chat not found", originalError: error });
            },
        })
    },
    createMessage: function (chatId: string, senderId: string, content: string): Effect.Effect<Message, DatabaseError> {
        return Effect.tryPromise({
            try: async () => {
                const newMessage = await new messageModel({
                    chat: new Types.ObjectId(chatId),
                    sender: new Types.ObjectId(senderId),
                    content
                }).save();

                await chatModel.findByIdAndUpdate(chatId, {
                    latestMessage: newMessage._id
                });

                return await newMessage.populate("sender", "name profile")
            },
            catch: (error) => new DatabaseError({ message: "Send message failed", originalError: error })
        })
    },
    getMessagesByChatId: function (chatId: string): Effect.Effect<Message[], DatabaseError> {
        return Effect.tryPromise({
            try: () => messageModel.find({ chat: new Types.ObjectId(chatId) })
                .populate("sender", "name profile")
                .sort({ createdAt: 1 })
                .lean()
                .exec(),
            catch: (e) => new DatabaseError({ message: "Fetch messages failed", originalError: e })
        })
    }
})