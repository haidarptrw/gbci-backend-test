import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./schema/user.schema";
import { Context, Effect } from "effect";
import { BcryptError, DatabaseError, UserAlreadyExists, UserNotFound } from "src/common/errors";
import { RegisterUserDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from "src/common/effect/services/repositories";
import { USERS_REPO_TOKEN } from "./users.token";

@Injectable()
export class UsersService {
    constructor(
        @Inject(USERS_REPO_TOKEN)
        private repo: Context.Tag.Service<UsersRepository>
    ) { }

    findById(id: string) {
        return Effect.provideService(
            this.findByIdLogic(id),
            UsersRepository,
            this.repo
        );
    }

    findByEmail(email: string) {
        return Effect.provideService(
            this.findByEmailLogic(email),
            UsersRepository,
            this.repo
        );
    }

    findByUsername(userName: string) {
        return Effect.provideService(
            this.findByUsernameLogic(userName),
            UsersRepository,
            this.repo
        )
    }

    findByUsernameOrEmail(identifier: string) {
        return Effect.provideService(
            this.findByUsernameOrEmailLogic(identifier),
            UsersRepository,
            this.repo
        )
    }

    findByIdWithRefreshToken(id: string) {
        return Effect.provideService(
            this.findByIdWithRefreshTokenLogic(id),
            UsersRepository,
            this.repo
        )
    }

    updateRefreshToken(userId: string, refreshToken: string) {
        return Effect.provideService(
            this.updateRefreshTokenLogic(userId, refreshToken),
            UsersRepository,
            this.repo
        )
    }

    create(data: RegisterUserDto) {
        return Effect.provideService(
            this.createLogic(data),
            UsersRepository,
            this.repo
        )
    }

    deleteById(id: string) {
        return Effect.provideService(
            this.deleteByIdLogic(id),
            UsersRepository,
            this.repo
        )
    }

    updatePassword(userId: string, plainPassword: string) {
        return Effect.provideService(
            this.updatePasswordLogic(userId, plainPassword), 
            UsersRepository, 
            this.repo
        );
    }

    // ========== BUSINESS LOGIC ====================

    public findByIdLogic(id: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.findById(id);
        });

        return program;
    }

    public findByEmailLogic(email: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.findByEmail(email);
        });

        return program;
    }

    public findByUsernameLogic(userName: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.findByUsername(userName);
        });

        return program;
    }

    public findByUsernameOrEmailLogic(identifier: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.findByUsernameOrEmail(identifier);
        });

        return program;
    }

    public findByIdWithRefreshTokenLogic(id: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.findByIdWithRefreshToken(id);
        });

        return program;
    }

    public updateRefreshTokenLogic(userId: string, refreshToken: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            const hash = yield* Effect.tryPromise({
                try: async () => await bcrypt.hash(refreshToken, 10),
                catch: () => new BcryptError()
            });

            return yield* repo.updateRefreshToken(userId, hash);
        });

        return program;
    }

    /// Create new User (called via register API)
    public createLogic(data: RegisterUserDto) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;

            const hashedPassword = yield* Effect.tryPromise({
                try: async () => await bcrypt.hash(data.password, 10),
                catch: () => new BcryptError()
            });

            const userToCreate = { ...data, password: hashedPassword };
            const newUser = yield* repo.create(userToCreate);
            return newUser;
        });

        return program;
    }

    public deleteByIdLogic(id: string) {
        const program = Effect.gen(function* () {
            const repo = yield* UsersRepository;
            return yield* repo.deleteById(id);
        });

        return program;
    }

    public updatePasswordLogic(userId: string, plainPassword: string) {
        return Effect.gen(this, function* () {
            const repo = yield* UsersRepository;
            const hashedPassword = yield* Effect.tryPromise({
                try: () => bcrypt.hash(plainPassword, 10),
                catch: () => new BcryptError()
            });

            return yield* repo.updatePassword(userId, hashedPassword);
        })
    }
}