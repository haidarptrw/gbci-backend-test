import { UseGuards, Controller, Get, Req, Param, NotFoundException, InternalServerErrorException, Put, UsePipes, Body, BadRequestException, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ProfileService } from "./profile.service";
import { Effect, Exit, Option } from "effect";
import * as profileDto from "../dto/profile.dto";
import * as types from "src/common/types";

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('users/profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get(':userId')
    @ApiOperation({ summary: 'Get a user profile by ID' })
    async getUserProfile(@Param('userId') userId: string) {
        return this.runEffect(this.profileService.getProfile(userId));
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create or Update profile' })
    @ApiResponse({ status: 200, description: 'Profile successfully updated', type: profileDto.UpdateProfileDto})
    @ApiResponse({ status: 404, description: 'User not found' })
    @UseGuards(JwtAuthGuard)
    async updateMyProfile(@Req() req: types.AuthenticatedRequest, @Body() dto: profileDto.UpdateProfileDto) {
        const userId = req.user.userId;

        return this.runEffect(this.profileService.updateProfile(userId, dto));
    }

    private async runEffect<A, E>(program: Effect.Effect<A, E>) {
        const exit = await Effect.runPromiseExit(program);

        if (Exit.isSuccess(exit)) {
            return exit.value;
        } else {
            const cause = exit.cause;
            if (cause._tag !== 'Fail') {
                throw new InternalServerErrorException();
            }
            const error: any = cause.error;
            switch (error._tag) {
                case 'UserNotFound':
                    throw new NotFoundException('User not found');
                case 'DatabaseError':
                    throw new InternalServerErrorException('Database error');
                default:
                    throw new InternalServerErrorException('Unexpected error');
            }
        }
    }
}