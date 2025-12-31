import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Console, Effect, Schema as EffectSchema, Exit } from 'effect';
import { UserSchema_Effect } from 'src/users/schema/user.schema';

/**
 * Helper function to parse req to a concrete 'User' format.
 * This is formally used to validate the req from the Passport JWT strategy
 * @param req
 * @returns
 */
export function getUserFromReq(req: any) {
  return Effect.fromNullable(req.user).pipe(
    Effect.mapError(() => new BadRequestException('User context missing')),

    Effect.flatMap((plainUser) =>
      EffectSchema.decodeUnknown(UserSchema_Effect)(plainUser),
    ),
    Effect.catchAll((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`Error: ${errorMessage}`);
      return Effect.fail(new InternalServerErrorException(errorMessage));
    }),
  );
}
