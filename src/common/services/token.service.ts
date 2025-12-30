import { Injectable } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { Effect } from "effect";
import { TokenGenerationError } from "src/common/errors";
import { JwtPayload, JwtPayloadSchema } from "src/common/types";

@Injectable()
export class TokenService {
    constructor(private readonly jwtService: JwtService) {}

    // Wrapper for Signing
    signAsync(args: {payload: JwtPayload, secret: string, expiresIn: JwtSignOptions['expiresIn']}) {
        const {payload, secret, expiresIn} = args;
        return Effect.tryPromise({
            try: () => this.jwtService.signAsync(payload, { secret: secret, expiresIn: expiresIn }),
            catch: (cause) => new TokenGenerationError({ cause })
        });
    }

    // Wrapper for Verification
    verifyAsync(args: {token: string, secret: string}) {
        const {token, secret} = args;
        return Effect.tryPromise({
            try:  async () => {
                const raw = await this.jwtService.verifyAsync(token, { secret });

                return JwtPayloadSchema.parse(raw);
            },
            catch: (cause) => new Error("Invalid Token") // Or a specific error
        });
    }
}