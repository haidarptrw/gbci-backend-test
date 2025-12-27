import { createZodDto } from "nestjs-zod";
import z from "zod";

export const RegisterUserSchema = z.object({
    email: z.email({error: "Invalid email address"}),
    userName: z.string().min(8, {error: "Username must be at least 8 characters long"}),
    password: z.string().min(8, {error: "Password must be at least 8 characters long"}),
})

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {}