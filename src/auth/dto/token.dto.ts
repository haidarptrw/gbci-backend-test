import { createZodDto } from "nestjs-zod";
import z from "zod";

export const TokenPayloadSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: z.object({
        id: z.string(),
    })
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export class TokenDto extends createZodDto(TokenPayloadSchema) {}