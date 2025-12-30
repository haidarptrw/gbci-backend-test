import { Context, Effect } from "effect";
import { Model } from "mongoose";
import { ProfileRepository } from "src/common/effect/services/repositories";
import { UserNotFound, DatabaseError } from "src/common/errors";
import { User } from "../schema/user.schema";

export const createMongoProfileRepository = (userModel: Model<User>): Context.Tag.Service<ProfileRepository> => ({   
    getProfile: (userId) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({ _id: userId, deletedAt: null })
                .select('+profile')
                .lean()
                .exec();

            if (!user) throw new UserNotFound({ id: userId });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound 
            ? e 
            : new DatabaseError({ message: 'DB query failed', originalError: e })
    }),

    updateProfile: (userId, dto) => Effect.tryPromise({
        try: async () => {
            const updatedUser = await userModel.findByIdAndUpdate(
                userId,
                { $set: { profile: dto } },
                { new: true, runValidators: true }
            )
            .select('profile')
            .lean()
            .exec();

            if (!updatedUser) throw new UserNotFound({ id: userId });
            return updatedUser as User;
        },
        catch: (e) => e instanceof UserNotFound 
            ? e 
            : new DatabaseError({ message: 'Update profile failed', originalError: e })
    })
});