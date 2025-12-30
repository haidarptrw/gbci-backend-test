// users/users.module.ts

import { Module } from "@nestjs/common";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schema/user.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ProfileModule } from "./profile/profile.module";
import { USERS_REPO_TOKEN } from "./users.token";
import { Model } from "mongoose";
import { createMongoUsersRepository } from "./users.repository";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [UsersController],
    providers: [
        {
            provide: USERS_REPO_TOKEN,
            useFactory: (userModel: Model<User>) => {
                return createMongoUsersRepository(userModel);
            },
            inject: [getModelToken(User.name)],
        },
        UsersService
    ],
    exports: [UsersService, MongooseModule],
})
export class UsersModule { }