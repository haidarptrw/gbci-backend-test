import { UseGuards, Controller, Get, Req, Param, NotFoundException, InternalServerErrorException, Put, UsePipes, Body, BadRequestException, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ProfileService } from "./profile.service";
import { Effect, Exit, Match, Option, Schema as EffectSchema } from "effect";
import { AppError } from "src/common/errors";
import { Profile } from "../schema/profile.schema";
import { getUserFromReq } from "src/common/utils/parser";
import { UpdateProfileDto } from "../dto/profile.dto";

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('users/profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get(':userId')
    @ApiOperation({ summary: 'Get a user profile by ID' })
    @ApiResponse({ status: 200, description: 'Profile successfully retrieved', type: Profile })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserProfile(@Param('userId') userId: string) {
        return this.runEffect(this.profileService.getProfile(userId));
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create or Update profile' })
    @ApiResponse({ status: 200, description: 'Profile successfully updated', type: UpdateProfileDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    @UseGuards(JwtAuthGuard)
    async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        const userId = (await Effect.runPromise(getUserFromReq(req)))._id.toString();

        return this.runEffect(this.profileService.updateProfile(userId, dto));
    }

    private async runEffect<A, E extends AppError>(program: Effect.Effect<A, E>) {
        const exit = await Effect.runPromiseExit(program);

        // Use Match on the Exit type directly
        return Match.value(exit).pipe(
            Match.tag("Success", (success) => success.value),
            Match.tag("Failure", (failure) => {
                const cause = failure.cause;

                if (cause._tag !== "Fail") throw new InternalServerErrorException();


                const error = cause.error as AppError;

                return Match.value(error).pipe(
                    Match.tag("UserNotFound", () => { throw new NotFoundException("User not found"); }),
                    Match.tag("DatabaseError", () => { throw new InternalServerErrorException("Database error"); }),
                    Match.orElse(() => { throw new InternalServerErrorException("Unexpected error"); })
                );
            }),
            Match.exhaustive
        );
    }
}