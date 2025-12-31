import { Inject, Injectable } from "@nestjs/common";
import { Context, Effect } from "effect";
import { MailClient } from "./mail.client";
import { AppConfigService } from "../configs/app-config.service";

export const MAIL_CLIENT_TOKEN = Symbol("MAIL_CLIENT_TOKEN");

/**
 * Service for sending email (required for forgot password)
 */ 
@Injectable()
export class MailService {
    constructor(
        @Inject(MAIL_CLIENT_TOKEN) 
        private readonly client: Context.Tag.Service<MailClient>,
    ) {}

    sendForgotPasswordEmail(email: string, token: string, frontendUrl: string = "http://localhost:3000") {
        return Effect.gen(this, function* () {
            const client = yield* MailClient;
            
            // NOTE: Still hardcoded with localhost, we need the actual frontend URL
            const resetLink = `${frontendUrl}/reset-password?token=${token}`;
            
            const html = `
                <h3>Reset Your Password</h3>
                <p>You requested to reset your password.</p>
                <p>Click the link below to proceed:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link expires in 1 hour.</p>
            `;

            yield* client.sendMail(email, "Reset Password Request", html);
        }).pipe(
            Effect.provideService(MailClient, this.client)
        );
    }
}