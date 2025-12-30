import { Inject, Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { User } from "../schema/user.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Context, Effect } from "effect";
import { DatabaseError, UserNotFound } from "src/common/errors";
import { UpdateProfileDto } from "../dto/profile.dto";
import { mapDateToHoroscope, mapDateToZodiac } from "src/common/utils/calculator";
import { ProfileRepository } from "src/common/effect/services/repositories";
import { PROFILE_REPO_TOKEN } from "./profile.token";

@Injectable()
export class ProfileService {
    constructor(
        @Inject(PROFILE_REPO_TOKEN)
        private readonly repo: Context.Tag.Service<ProfileRepository>
    ) { }

    getProfile(userId: string) {
        return Effect.provideService(
            this.getProfileLogic(userId),
            ProfileRepository,
            this.repo
        );
    }

    updateProfile(userId: string, dto: Omit<UpdateProfileDto, 'horoscope' | 'zodiac'>) {
        return Effect.provideService(
            this.updateProfileLogic(userId, dto),
            ProfileRepository,
            this.repo
        );
    }

    public getProfileLogic(userId: string) {
        const program = Effect.gen(function* () {
            const repo = yield* ProfileRepository;
            return yield* repo.getProfile(userId);
        });

        return program;
    }

    public updateProfileLogic(userId: string, dto: Omit<UpdateProfileDto, 'horoscope' | 'zodiac'>) {
        const program = Effect.gen(function* () {
            const repo = yield* ProfileRepository;

            let finalDto: UpdateProfileDto = { ...dto };

            if (dto.birthday) {
                const date = new Date(dto.birthday);

                const horoscope = yield* mapDateToHoroscope(date);
                const zodiac = yield* mapDateToZodiac(date);

                finalDto.horoscope = horoscope;
                finalDto.zodiac = zodiac;
            }

            const updatedProfile = yield* repo.updateProfile(userId, finalDto);
            return updatedProfile;
        });

        return program;
    }
}