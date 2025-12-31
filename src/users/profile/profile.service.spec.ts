import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "./profile.service";
import { PROFILE_REPO_TOKEN } from "./profile.token";
import { Effect, Exit } from "effect";
import { UserNotFound, DatabaseError } from "src/common/errors";
import { Horoscope, Zodiac } from "src/common/effect/enums/profiles";
import { UpdateProfileDto } from "../dto/profile.dto";

describe("ProfileService", () => {
  let service: ProfileService;
  let mockRepo: any;

  // Mock Data
  const mockUserId = "user-123";
  const mockUser = {
    _id: mockUserId,
    userName: "testuser",
    profile: {
      displayName: "Test User",
    },
  };

  beforeEach(async () => {
    // Create the Mock Repository
    mockRepo = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PROFILE_REPO_TOKEN,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return the profile when repo succeeds", async () => {
      // Mock Repo Success
      mockRepo.getProfile.mockReturnValue(Effect.succeed(mockUser));

      // Run the Effect
      const program = service.getProfile(mockUserId);
      const result = await Effect.runPromise(program);

      expect(mockRepo.getProfile).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it("should fail when repo returns UserNotFound", async () => {
      // Mock Repo Failure
      const error = new UserNotFound({ id: mockUserId });
      mockRepo.getProfile.mockReturnValue(Effect.fail(error));

      const program = service.getProfile(mockUserId);
      const exit = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause).toEqual(expect.objectContaining({ error }));
      }
    });
  });

  describe("updateProfile", () => {
    it("should update profile without calculating zodiac/horoscope if birthday is missing", async () => {
      const dto: UpdateProfileDto = {
        displayName: "New Name",
        // No birthday provided
      };

      const expectedUpdatedUser = { ...mockUser, profile: { ...mockUser.profile, ...dto } };
      mockRepo.updateProfile.mockReturnValue(Effect.succeed(expectedUpdatedUser));

      const program = service.updateProfile(mockUserId, dto);
      const result = await Effect.runPromise(program);

      // Verify repo was called with the exact DTO passed in (no extra fields)
      expect(mockRepo.updateProfile).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(expectedUpdatedUser);
    });

    it("should calculate and inject zodiac/horoscope when birthday is provided", async () => {
      // Input: Sep 10, 1990 -> Virgo & Horse
      const dto: UpdateProfileDto = {
        displayName: "Birthday User",
        birthday: "1990-09-10", // Virgo, Horse
      };

      // Mock output from Repo
      // The repo should receive the ENRICHED dto
      const expectedEnrichedDto = {
        ...dto,
        horoscope: Horoscope.Virgo(),
        zodiac: Zodiac.Horse(),
      };

      const expectedUpdatedUser = { 
        ...mockUser, 
        profile: expectedEnrichedDto 
      };

      mockRepo.updateProfile.mockReturnValue(Effect.succeed(expectedUpdatedUser));

      const program = service.updateProfile(mockUserId, dto);
      const result = await Effect.runPromise(program);

      // Verify the Logic:
      // The service should have calculated the values and passed them to the repo
      expect(mockRepo.updateProfile).toHaveBeenCalledWith(
        mockUserId, 
        expect.objectContaining({
          displayName: "Birthday User",
          birthday: "1990-09-10",
          // We assert that the Effect Enum objects were added
          horoscope: Horoscope.Virgo(),
          zodiac: Zodiac.Horse()
        })
      );

      expect(result).toEqual(expectedUpdatedUser);
    });

    it("should propagate database errors from the repository", async () => {
      const dto: UpdateProfileDto = { displayName: "Error User" };
      const dbError = new DatabaseError({ message: "DB Connection Lost", originalError: {} });

      mockRepo.updateProfile.mockReturnValue(Effect.fail(dbError));

      const program = service.updateProfile(mockUserId, dto);
      const exit = await Effect.runPromiseExit(program);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause).toEqual(expect.objectContaining({ error: dbError }));
      }
    });

    it("should fail if calculator fails (e.g., invalid date)", async () => {
      // "Invalid Date" usually results in NaN date which utility handles
      const dto: UpdateProfileDto = {
        birthday: "invalid-date-string"
      };

      // The utility 'mapDateToHoroscope' uses Effect.try and checks for isNaN
      // so it should fail with InvalidDateError before reaching the repo.
      
      const program = service.updateProfile(mockUserId, dto);
      const exit = await Effect.runPromiseExit(program);

      expect(mockRepo.updateProfile).not.toHaveBeenCalled();
      
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
         // Expecting InvalidDateError from the calculator utility
         expect(exit.cause.error).toEqual(expect.objectContaining({ _tag: "InvalidDateError" }));
      }
    });
  });
});