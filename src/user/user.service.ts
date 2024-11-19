import {
  Injectable,
  ConflictException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { KafkaService } from '../kafka/kafka.service';
import { CustomLoggerService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private kafkaService: KafkaService,
    private metricsService: MetricsService,
    @Inject('Logger') private logger: CustomLoggerService,
  ) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        this.logger.log(
          `Registration attempt with existing email: ${data.email}`,
          'UserService',
        );
        throw new ConflictException('Email already in use');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user: User = await this.prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });

      this.logger.log(`New user registered: ${user.id}`, 'UserService');
      this.metricsService.incrementUserRegistration();

      await this.kafkaService.emit('user_registered', {
        id: user.id,
        email: user.email,
      });

      return user;
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Handle Prisma-specific errors
        if (error.code === 'P2002') {
          this.logger.warn(
            `Attempt to create user with existing email: ${data.email}`,
            'UserService',
          );
          throw new ConflictException('Email already in use');
        }
      }

      if (error instanceof Error) {
        this.logger.error(
          `Error creating user: ${error.message}`,
          error.stack,
          'UserService',
        );
      } else {
        this.logger.error(
          'Unknown error occurred while creating user',
          '',
          'UserService',
        );
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updatePassword(
    id: string,
    hashedPassword: string,
  ): Promise<User | null> {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }
}
