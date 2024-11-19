import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomLoggerService } from '../logging/logging.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject('Logger') private logger: CustomLoggerService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;
      const user = {
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        picture: photos[0].value,
        accessToken,
      };
      done(null, user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Google authentication error: ${error.message}`,
          error.stack,
          'GoogleStrategy',
        );
      } else {
        this.logger.error(
          'Unknown error occurred during Google authentication',
          '',
          'GoogleStrategy',
        );
      }

      done(
        new InternalServerErrorException('Google authentication failed'),
        null,
      );
    }
  }
}
