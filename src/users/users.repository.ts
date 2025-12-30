import { Context, Effect } from "effect";
import { Model } from "mongoose";
import { UsersRepository } from "src/common/effect/services/repositories";
import { UserNotFound, DatabaseError, UserAlreadyExists } from "src/common/errors";
import { User } from "./schema/user.schema";

export const createMongoUsersRepository = (userModel: Model<User>): Context.Tag.Service<UsersRepository> => ({
    findById: (id) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({ _id: id, deletedAt: null }).lean().exec();
            if (!user) throw new UserNotFound({ id });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Find By ID failed', originalError: e })
    }),

    findByEmail: (email) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({ email, deletedAt: null }).select('+password').lean().exec();
            if (!user) throw new UserNotFound({ email });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Find By Email failed', originalError: e })
    }),

    findByUsername: (userName) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({ userName, deletedAt: null }).select('+password').lean().exec();
            if (!user) throw new UserNotFound({ userName });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Find By Username failed', originalError: e })
    }),

    findByUsernameOrEmail: (identifier) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({
                $or: [{ email: identifier }, { userName: identifier }],
                deletedAt: null
            }).select('+password').lean().exec();
            if (!user) throw new UserNotFound({ id: identifier });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Find user failed', originalError: e })
    }),

    findByIdWithRefreshToken: (id) => Effect.tryPromise({
        try: async () => {
            const user = await userModel.findOne({ _id: id, deletedAt: null }).select('+refreshToken').lean().exec();
            if (!user) throw new UserNotFound({ id });
            return user as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Find with token failed', originalError: e })
    }),

    create: (data) => Effect.tryPromise({
        try: async () => {
            try {
                const createdUser = new userModel(data);
                return await createdUser.save();
            } catch (error: any) {
                if (error.code === 11000) {
                    throw new UserAlreadyExists({ email: data.email });
                }
                throw error;
            }
        },
        catch: (e) => e instanceof UserAlreadyExists
            ? e
            : new DatabaseError({ message: 'Create user failed', originalError: e })
    }),

    updateRefreshToken: (userId, hash) => Effect.tryPromise({
        try: async () => {
            await userModel.findByIdAndUpdate(userId, { refreshToken: hash }).exec();
        },
        catch: (e) => new DatabaseError({ message: 'Update token failed', originalError: e })
    }),

    deleteById: (id) => Effect.tryPromise({
        try: async () => {
            const deleted = await userModel.findByIdAndUpdate(
                id,
                { deletedAt: new Date() },
                { new: true }
            ).lean().exec();
            if (!deleted) throw new UserNotFound({ id });
            return deleted as User;
        },
        catch: (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Delete failed', originalError: e })
    }),
    updatePassword: function (userId: string, hashedPassword: string) {
        return Effect.tryPromise({
            try: async function () {
                const updated = await userModel.findByIdAndUpdate(
                    userId,
                    {password: hashedPassword},
                    {new: true}
                ).lean().exec();

                if (!updated) throw new UserNotFound({id: userId});
                return;
            },
            catch:  (e) => e instanceof UserNotFound ? e : new DatabaseError({ message: 'Update password failed', originalError: e })
        })
    }
}); 
