import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { KafkaService } from './kafka/kafka.service';
import { CustomLoggerService } from './logging/logging.service';
import { MetricsService } from './metrics/metrics.service';

@Module({
  imports: [UserModule, AuthModule],
  controllers: [AppController],
  providers: [
    PrismaService,
    KafkaService,
    CustomLoggerService,
    MetricsService,
    {
      provide: 'Logger',
      useClass: CustomLoggerService,
    },
    AppService,
  ],
  exports: [PrismaService, KafkaService, CustomLoggerService, MetricsService],
})
export class AppModule {}
