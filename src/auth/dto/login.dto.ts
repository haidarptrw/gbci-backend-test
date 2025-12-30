import { createZodDto } from "nestjs-zod";
import z from "zod";

export const LoginSchema = z.object({
    identifier: z.string({error: "Invalid email address or username"}),
    password: z.string().min(1, {error: "Password is required"}),
});

export class LoginDto extends createZodDto(LoginSchema) {}