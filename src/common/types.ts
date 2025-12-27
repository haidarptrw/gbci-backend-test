import express from 'express';

export interface JwtPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface RefreshUser extends JwtPayload {
    refreshToken: string;
}

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

export interface AuthenticatedRequest extends express.Request {
    user: AuthenticatedUser;
}