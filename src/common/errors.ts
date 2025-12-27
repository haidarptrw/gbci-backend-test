import {Data} from 'effect';

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
    id?: string;
    email?: string;
    userName?: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string;
  originalError: unknown;
}> {}

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials") {}

export class TokenGenerationError extends Data.TaggedError("TokenGenerationError")<{
  cause: unknown 
}> {}

export class InvalidRefreshToken extends Data.TaggedError("InvalidRefreshToken") {}

export class UserAlreadyExists extends Data.TaggedError("UserAlreadyExists")<{
  email: string;
}> {}

export class BcryptError extends Data.TaggedError("BcryptError") {}

export class InvalidDateError extends Data.TaggedError("InvalidDateError")<{
    message: string;
}> {}