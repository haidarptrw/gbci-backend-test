import { Data, Effect } from 'effect';

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
  id?: string;
  email?: string;
  userName?: string;
}> { }

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string;
  originalError: unknown;
}> { }

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials") { }

export class TokenGenerationError extends Data.TaggedError("TokenGenerationError")<{
  cause: unknown
}> { }

export class InvalidRefreshToken extends Data.TaggedError("InvalidRefreshToken") { }

export class InvalidResetToken extends Data.TaggedError("InvalidResetToken") {}

export class UserAlreadyExists extends Data.TaggedError("UserAlreadyExists")<{
  email: string;
}> { }

export class BcryptError extends Data.TaggedError("BcryptError") { }

export class InvalidDateError extends Data.TaggedError("InvalidDateError")<{
  message: string;
}> { }

export class MailError extends Data.TaggedError("MailError")<{
  message: string;
  originalError: unknown;
}> { }

export type AppError =
  | UserNotFound
  | DatabaseError
  | InvalidCredentials
  | TokenGenerationError
  | InvalidRefreshToken
  | UserAlreadyExists
  | BcryptError
  | InvalidDateError
  | MailError