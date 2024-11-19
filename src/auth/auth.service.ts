import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private metricsService: MetricsService,
    @Inject('Logger') private logger: CustomLoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.validateUser(email, password);

      if (user) {
        this.logger.log(`User logged in: ${user.id}`, 'AuthService');
        this.metricsService.incrementLoginAttempt('success');
        return user;
      }

      this.logger.log(
        `Failed login attempt for email: ${email}`,
        'AuthService',
      );
      this.metricsService.incrementLoginAttempt('failure');
      throw new UnauthorizedException('Invalid credentials');
    } catch (error) {
      this.logger.error(
        `Error during user validation: ${error.message}`,
        error.stack,
        'AuthService',
      );
      throw error;
    }
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendPasswordResetEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.jwtService.sign({ sub: user.id }, { expiresIn: '15m' });

    // Here you would typically send an email with a link containing the token
    // For demonstration purposes, we'll just log it
    console.log(
      `Password reset link: http://yourfrontend.com/reset-password?token=${token}`,
    );

    // In a real application, you'd use nodemailer or a similar library to send an actual email
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ ... });
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.sub);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userService.updatePassword(user.id, hashedPassword);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async googleLogin(user: any) {
    if (!user) {
      return 'No user from google';
    }

    // Check if user exists in our database
    let existingUser = await this.userService.findByEmail(user.email);

    if (!existingUser) {
      // If user doesn't exist, create a new one
      existingUser = await this.userService.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        // You might want to generate a random password here
        password: Math.random().toString(36).slice(-8),
      });
    }

    const payload = { email: existingUser.email, sub: existingUser.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
