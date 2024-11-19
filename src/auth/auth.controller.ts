import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
  Res,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { CustomLoggerService } from '../logging/logging.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject('Logger') private logger: CustomLoggerService,
  ) {}

  @Post('login')
  async login(@Body() loginData: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUser(
        loginData.email,
        loginData.password,
      );
      return this.authService.login(user);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(
          `Failed login attempt for email: ${loginData.email}`,
          'AuthController',
        );
        throw error;
      }

      if (error instanceof Error) {
        this.logger.error(
          `Login error: ${error.message}`,
          error.stack,
          'AuthController',
        );
      } else {
        this.logger.error(
          'Unknown error occurred during login',
          '',
          'AuthController',
        );
      }

      throw new InternalServerErrorException('Login failed');
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    try {
      await this.authService.sendPasswordResetEmail(email);
      return { message: 'Password reset email sent' };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Password reset error: ${error.message}`,
          error.stack,
          'AuthController',
        );
      } else {
        this.logger.error(
          'Unknown error occurred during password reset',
          '',
          'AuthController',
        );
      }

      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    try {
      await this.authService.resetPassword(token, newPassword);
      return { message: 'Password reset successful' };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Password reset error: ${error.message}`,
          error.stack,
          'AuthController',
        );
      } else {
        this.logger.error(
          'Unknown error occurred during password reset',
          '',
          'AuthController',
        );
      }

      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    console.log(req);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res() res) {
    console.log(res);
    return this.authService.googleLogin(req.user);
  }
}
