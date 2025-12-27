import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Gender, Horoscope, Zodiac } from 'src/common/enums/profiles';

const GenderSchema = z.enum(["Male", "Female", "DoNotWantToSpecify"])
    .transform((str) => (Gender as any)[str]());

const HoroscopeSchema = z.enum([
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]).transform((str) => (Horoscope as any)[str]());

const ZodiacSchema = z.enum([
    "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
    "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"
]).transform((str) => (Zodiac as any)[str]());

export const CreateProfileSchema = z.object({
    displayName: z.string().optional(),
    
    about: z.string().max(500).optional(),
    
    interest: z.string().optional(),
    
    gender: GenderSchema.optional(),
    
    birthday: z.iso.datetime().optional(), 
    
    horoscope: HoroscopeSchema.optional(),
    
    zodiac: ZodiacSchema.optional(),
    
    height: z.number().int().positive().lt(300).optional(),
    
    weight: z.number().int().positive().lt(300).optional(),
    
    bannerUrl: z.string().optional(), 
});


export class CreateProfileDto extends createZodDto(CreateProfileSchema) {}

export const UpdateProfileSchema = CreateProfileSchema.partial();

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}