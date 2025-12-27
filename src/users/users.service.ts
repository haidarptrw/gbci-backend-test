import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./schema/user.schema";
import { Data, Effect } from "effect";
import { BcryptError, DatabaseError, UserAlreadyExists, UserNotFound } from "src/common/errors";
import { RegisterUserDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UnknownException } from "effect/Cause";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    findById(id: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield*
                Effect.tryPromise({
                    try: () => this.userModel.findOne({ _id: id, deletedAt: null }).lean().exec(),
                    catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
                });

            if (!user) {
                return yield* new UserNotFound({ id });
            }

            return user;
        });
    }

    findByEmail(email: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield* Effect.tryPromise({
                try: () => this.userModel.findOne({ email, deletedAt: null }).select('+password').lean().exec(),
                catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
            });

            if (!user) {
                return yield* new UserNotFound({ email });
            }

            return user;
        })
    }

    findByUsername(userName: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield* Effect.tryPromise({
                try: () => this.userModel.findOne({ userName, deletedAt: null }).select('+password').lean().exec(),
                catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
            });

            if (!user) {
                return yield* new UserNotFound({ userName });
            }

            return user;
        })
    }

    findByUsernameOrEmail(identifier: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield* Effect.tryPromise({
                try: () => this.userModel.findOne({
                    $or: [{ email: identifier }, { userName: identifier }],
                    deletedAt: null
                }).select('+password').lean().exec(),
                catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
            });

            if (!user) {
                return yield* new UserNotFound({ id: identifier });
            }

            return user;
        });
    }

    findByIdWithRefreshToken(id: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const user = yield* Effect.tryPromise({
                try: () => this.userModel.findOne({ _id: id, deletedAt: null }).select('+refreshToken').lean().exec(),
                catch: (error) => new DatabaseError({ message: 'DB query failed', originalError: error })
            });

            if (!user) {
                return yield* new UserNotFound({ id });
            }
            return user;
        });
    }

    updateRefreshToken(userId: string, refreshToken: string): Effect.Effect<void, DatabaseError | BcryptError> {
        return Effect.gen(this, function* () {
            const hash = yield* Effect.tryPromise({
                try: async () => await bcrypt.hash(refreshToken, 10),
                catch: () => new BcryptError()
            });

            yield* Effect.tryPromise({
                try: () => this.userModel.findByIdAndUpdate(userId, { refreshToken: hash }).exec(),
                catch: (error) => new DatabaseError({ message: 'Update token failed', originalError: error })
            });
        });
    }

    /// Create new User (called via register API)
    create(data: RegisterUserDto): Effect.Effect<User, DatabaseError | UserAlreadyExists | BcryptError> {
        return Effect.gen(this, function* () {
            const hashedPassword = yield* Effect.tryPromise({
                try: async () => await bcrypt.hash(data.password, 10),
                catch: () => { 
                    console.log("error hashing the password")
                    return new BcryptError() 
                }
            });
            const newUser = yield* Effect.tryPromise({
                try: async () => {
                    const createdUser = new this.userModel({
                        ...data,
                        password: hashedPassword
                    });
                    return await createdUser.save();
                },
                catch: (error: any) => {
                    if (error.code === 11000) {
                        return new UserAlreadyExists({ email: data.email });
                    }

                    return new DatabaseError({ message: 'Creation failed', originalError: error });
                }
            });

            return newUser.toObject();
        });
    }

    deleteById(id: string): Effect.Effect<User, UserNotFound | DatabaseError> {
        return Effect.gen(this, function* () {
            const deletedUser = yield* Effect.tryPromise({
                try: () => this.userModel.findByIdAndUpdate(
                    id,
                    { deletedAt: new Date() },
                    { new: true }
                ).lean().exec(),
                catch: (error) => new DatabaseError({ message: 'Delete failed', originalError: error })
            });

            if (!deletedUser) {
                return yield* new UserNotFound({ id });
            }

            return deletedUser;
        });
    }
}