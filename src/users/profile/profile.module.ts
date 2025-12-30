import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User, UserSchema } from '../schema/user.schema';
import { PROFILE_REPO_TOKEN } from './profile.token';
import { Model } from 'mongoose';
import { createMongoProfileRepository } from './profile.repository';
import { UsersModule } from '../users.module';

@Module({
  imports: [
    UsersModule,
  ],
  controllers: [ProfileController],
  providers: [
    {
      provide: PROFILE_REPO_TOKEN, 
      useFactory: (userModel: Model<User>) => {
          return createMongoProfileRepository(userModel);
      },
      inject: [getModelToken(User.name)],
    },
    ProfileService,
  ],
  exports: [ProfileService],
})
export class ProfileModule {}