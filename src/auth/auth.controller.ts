import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  InternalServerErrorException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterUserDto } from 'src/users/dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Effect, Exit, Match, Option } from 'effect';
import type { Request } from 'express';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtPayload } from 'src/common/types';
import express from 'express';
import { User, UserSchema_Effect } from 'src/users/schema/user.schema';
import { TokenDto } from './dto/token.dto';
import effect from 'effect';
import { getUserFromReq } from 'src/common/utils/parser';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register endpoint controller.
   * NOTE that this only register without verifying the email. I assume that this would be a simple register
   * To handle this properly, A verify endpoint needs to be added
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: User,
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async register(@Body() registerDto: RegisterUserDto) {
    const program = this.authService.register(registerDto);
    const exit = await Effect.runPromiseExit(program);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    } else {
      const cause = exit.cause;
      if (cause._tag === 'Fail') {
        switch (cause.error._tag) {
          case 'UserAlreadyExists':
            throw new ConflictException('Email already in use');
          case 'DatabaseError':
            console.error(cause.error.originalError);
            throw new InternalServerErrorException('Registration failed');
        }
      }
      throw new InternalServerErrorException();
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Return access and refresh tokens.',
    type: TokenDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const program = this.authService.login(loginDto);
    const exit = await Effect.runPromiseExit(program);

    if (Exit.isSuccess(exit)) {
      const result = exit.value;
      if (req.isMobile) {
        return result;
      } else {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // const { refreshToken, ...rest } = result;
        return result;
      }
    } else {
      const cause = exit.cause;
      if (cause._tag !== 'Fail') {
        throw new InternalServerErrorException();
      }

      Match.value(cause.error).pipe(
        Match.tag('InvalidCredentials', (_) => {
          throw new UnauthorizedException('Invalid email or password');
        }),
        Match.tag('TokenGenerationError', (tge) => {
          console.log(`Token generation error: ${tge.cause}`);
          throw new InternalServerErrorException('Login failed');
        }),
        Match.tag('DatabaseError', (dbe) => {
          console.log(`Database error: ${dbe.cause}`);
          throw new InternalServerErrorException('Login failed');
        }),
        Match.orElse((_) => {
          throw new InternalServerErrorException();
        }),
        Match.exhaustive,
      );
    }
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Refresh the refresh token of an user' })
  @ApiResponse({
    status: 200,
    description: 'Return access and refresh tokens.',
    type: TokenDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 400, description: 'User context missing.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async refreshTokens(
    @Req() req: express.Request,
    @Res({ passthrough: true })
    res: express.Response,
  ) {
    const program = Effect.gen(this, function* () {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.get('Authorization')?.replace('Bearer', '').trim();
      if (!refreshToken) {
        return yield* Effect.fail(
          new UnauthorizedException('Refresh token missing'),
        );
      }

      // safely parse the userId
      const concreteUser = yield* getUserFromReq(req);
      const userId = concreteUser._id.toString();

      return yield* this.authService.refreshTokens(userId, refreshToken);
    });

    const exit = await Effect.runPromiseExit(program);
    if (Exit.isSuccess(exit)) {
      const result = exit.value;

      if (req.isMobile) {
        return result;
      } else {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // const { refreshToken, ...rest } = result;
        return result;
      }
    } else {
      const failure = exit.cause;
      if (failure._tag === 'Fail') {
        throw failure.error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a reset link has been sent.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const program = this.authService.forgotPassword(dto.email);
    const exit = await Effect.runPromiseExit(program);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    } else {
      return {
        message: 'If the email exists, a reset link has been sent.'
      }
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const program = this.authService.resetPassword(dto.token, dto.newPassword);
    const exit = await Effect.runPromiseExit(program);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    } else {
      const cause = exit.cause;
      if (cause._tag === 'Fail') {
        Match.value(cause.error).pipe(
          Match.tag('InvalidResetToken', () => {
            throw new BadRequestException('Invalid or expired reset token');
          }),
          Match.tag('DatabaseError', (dbe) => {
            console.error(
              'Database error during password reset:',
              dbe.originalError,
            );
            throw new InternalServerErrorException('Failed to reset password');
          }),
          Match.orElse(() => {
            throw new InternalServerErrorException('Failed to reset password');
          }),
        );
      }
      throw new InternalServerErrorException('Failed to reset password');
    }
  }
}
