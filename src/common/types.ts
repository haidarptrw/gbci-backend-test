import express from 'express';
import z from 'zod';

export const JwtPayloadSchema = z.object({
    sub: z.string(),
    iat: z.number().optional(),
    exp: z.number().optional()
})

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

export interface AuthenticatedRequest extends express.Request {
    user: AuthenticatedUser;
}