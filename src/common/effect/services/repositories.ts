import { Context, Effect } from "effect";
import { Chat } from "src/chats/schema/chat.schema";
import { Message } from "src/chats/schema/message.schema";
import { DatabaseError, InvalidDateError, UserAlreadyExists, UserNotFound } from "src/common/errors";
import { UpdateProfileDto } from "src/users/dto/profile.dto";
import { RegisterUserDto } from "src/users/dto/register.dto";
import { Profile } from "src/users/schema/profile.schema";
import { User } from "src/users/schema/user.schema";

export class UsersRepository extends Context.Tag("UsersRepository")<
    UsersRepository,
    {
        readonly findById: (id: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly findByEmail: (email: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly findByUsername: (userName: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly findByUsernameOrEmail: (identifier: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly findByIdWithRefreshToken: (id: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly create: (data: RegisterUserDto) => Effect.Effect<User, DatabaseError | UserAlreadyExists>;
        readonly updateRefreshToken: (userId: string, hashedRefreshToken: string) => Effect.Effect<void, DatabaseError>;
        readonly updatePassword: (userId: string, hashedPassword: string) => Effect.Effect<void, UserNotFound | DatabaseError>;
        readonly deleteById: (id: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        
    }
>() { }

export class ProfileRepository extends Context.Tag("ProfileRepository")<
    ProfileRepository,
    {
        readonly getProfile: (userId: string) => Effect.Effect<User, UserNotFound | DatabaseError>;
        readonly updateProfile: (userId: string, dto: UpdateProfileDto)
            => Effect.Effect<Profile, UserNotFound | DatabaseError>;
    }
>() {}

export class ChatRepository extends Context.Tag("ChatRepository")<
    ChatRepository,
    {
        // Chat Operations
        readonly createChat: (members: string[], isGroup: boolean, name?: string) => Effect.Effect<Chat, DatabaseError>;
        readonly findChatByMembers: (members: string[]) => Effect.Effect<Chat | null, DatabaseError>;
        readonly getUserChats: (userId: string) => Effect.Effect<Chat[], DatabaseError>;
        readonly findChatById: (chatId: string) => Effect.Effect<Chat, DatabaseError>;
        
        // Message Operations
        readonly createMessage: (chatId: string, senderId: string, content: string) => Effect.Effect<Message, DatabaseError>;
        readonly getMessagesByChatId: (chatId: string) => Effect.Effect<Message[], DatabaseError>;
    }
>() {}