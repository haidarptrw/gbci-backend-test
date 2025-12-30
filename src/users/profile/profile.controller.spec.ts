import { Test, TestingModule } from "@nestjs/testing";
import { ProfileController } from "./profile.controller"
import { PROFILE_REPO_TOKEN } from "./profile.token";
import { UpdateProfileDto } from "../dto/profile.dto";
import { ProfileService } from "./profile.service";
import { Effect } from "effect";
import { DatabaseError, UserNotFound } from "src/common/errors";
import { InternalServerErrorException, NotFoundException } from "@nestjs/common";

jest.mock('src/common/utils/parser');
import { getUserFromReq } from 'src/common/utils/parser';


describe('ProfileController', () => {
    let controller: ProfileController;
    let service: ProfileService;

    const mockUserId = 'user-123';
    const mockProfile = {
        displayName: 'John Doe',
        bio: 'Software Engineer',
        horoscope: 'Aries',
        zodiac: 'Dragon'
    };
    const mockUpdateDto: UpdateProfileDto = {
        displayName: 'Mamah Jane Doe',
        birthday: '1990-01-01'
    };

    const mockUserResult = {
        _id: mockUserId,
        toString: () => mockUserId // Mongoose IDs have .toString()
    };

    const mockRequest = { user: {} };

    beforeEach(async () => {
        (getUserFromReq as jest.Mock).mockReturnValue(
            Effect.succeed(mockUserResult)
        );
        
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                {
                    provide: ProfileService,
                    useValue: {
                        getProfile: jest.fn(),
                        updateProfile: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ProfileController>(ProfileController);
        service = module.get<ProfileService>(ProfileService);
    });

    describe('getUserProfile', () => {
        it('should return the profile when service succeeds', async () => {
            jest.spyOn(service, 'getProfile').mockReturnValue(
                Effect.succeed(mockProfile as any)
            );

            const result = await controller.getUserProfile(mockUserId);
            expect(service.getProfile).toHaveBeenCalledWith(mockUserId);
            expect(result).toEqual(mockProfile);
        });

        it('should throw NotFoundException when service returns UserNotFound', async () => {
            jest.spyOn(service, 'getProfile').mockReturnValue(
                Effect.fail(new UserNotFound({ id: mockUserId }))
            );

            await expect(controller.getUserProfile(mockUserId))
                .rejects
                .toThrow(NotFoundException);
        })

        it('should throw InternalServerException for unexpected AppErrors', async () => {
            const unknownError = { _tag: "SomeRandomError" };
            jest.spyOn(service, 'getProfile').mockReturnValue(
                Effect.fail(unknownError as any)
            );

            await expect(controller.getUserProfile(mockUserId))
                .rejects
                .toThrow(InternalServerErrorException);
        })

        it('should throw InternalServerErrorException on system defects (Effect.die)', async () => {
            jest.spyOn(service, 'getProfile').mockReturnValue(
                Effect.die(new Error("Random system crash"))
            );

            await expect(controller.getUserProfile(mockUserId))
                .rejects
                .toThrow(InternalServerErrorException);
        })
    })

    describe('updateMyProfile', () => {
        it('should return updated profile when service succeeds', async () => {
            const updatedProfile = { ...mockProfile, displayName: 'Mamah Jane Doe' };
            jest.spyOn(service, 'updateProfile').mockReturnValue(
                Effect.succeed(updatedProfile as any)
            );

            const result = await controller.updateMyProfile(mockRequest, mockUpdateDto);

            expect(getUserFromReq).toHaveBeenCalledWith(mockRequest);
            expect(service.updateProfile).toHaveBeenCalledWith(mockUserId, mockUpdateDto);
            expect(result).toEqual(updatedProfile);
        });

        it('should throw NotFoundException when updating a non-existent user', async () => {
            jest.spyOn(service, 'updateProfile').mockReturnValue(
                Effect.fail(new UserNotFound({ id: mockUserId }))
            );

            await expect(controller.updateMyProfile(mockRequest, mockUpdateDto))
                .rejects
                .toThrow(NotFoundException);
        })

        it('should throw InternalServerErrorException on database failure during update', async () => {
            jest.spyOn(service, 'updateProfile').mockReturnValue(
                Effect.fail(new DatabaseError({ message: 'Update failed', originalError: {} }))
            );

            await expect(controller.updateMyProfile(mockRequest, mockUpdateDto))
                .rejects
                .toThrow(InternalServerErrorException);
        })
    });
})