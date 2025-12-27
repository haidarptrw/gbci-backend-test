import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { User } from "../schema/user.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Effect } from "effect";
import { DatabaseError, UserNotFound } from "src/common/errors";
import { UpdateProfileDto } from "../dto/profile.dto";

@Injectable()
export class ProfileService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    getProfile(userId: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield* Effect.tryPromise({
                try: () => this.userModel.findOne({ _id: userId, deletedAt: null })
                    .select('+profile')
                    .lean()
                    .exec(),
                catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
            });

            if (!user) {
                return yield* new UserNotFound({ id: userId });
            }

            return user;
        });
    }

    updateProfile(userId: string, dto: UpdateProfileDto) {
        return Effect.gen(this, function* () {
            const updatedUser = yield* Effect.tryPromise({
                try: () => this.userModel.findByIdAndUpdate(
                    userId,
                    { $set: { profile: dto } },
                    { new: true, runValidators: true }
                ).select('profile').lean().exec(),
                catch: (error) => new DatabaseError({ message: 'Update profile failed', originalError: error })
            });

            if (!updatedUser) {
                return yield* new UserNotFound({ id: userId });
            }

            return updatedUser.profile;
        });
    }
}