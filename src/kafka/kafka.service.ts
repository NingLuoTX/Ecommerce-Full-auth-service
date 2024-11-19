import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, KafkaJSError, Producer } from 'kafkajs';
import { CustomLoggerService } from '../logging/logging.service';

@Injectable()
export class KafkaService implements OnModuleInit {
  private producer: Producer;

  constructor(@Inject('Logger') private logger: CustomLoggerService) {
    const kafka = new Kafka({
      clientId: 'auth-service',
      brokers: ['localhost:9092'], // Update with your Kafka broker addresses
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Connected to Kafka', 'KafkaService');
    } catch (error: unknown) {
      if (error instanceof KafkaJSError) {
        this.logger.error(
          `Failed to connect to Kafka: ${error.message}`,
          error.stack,
          'KafkaService',
        );
      } else if (error instanceof Error) {
        this.logger.error(
          `Unknown error connecting to Kafka: ${error.message}`,
          error.stack,
          'KafkaService',
        );
      } else {
        this.logger.error(
          'Unknown error occurred while connecting to Kafka',
          '',
          'KafkaService',
        );
      }
    }
  }

  async emit(topic: string, message: any) {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      this.logger.log(`Message emitted to topic ${topic}`, 'KafkaService');
    } catch (error: unknown) {
      if (error instanceof KafkaJSError) {
        this.logger.error(
          `Failed to emit Kafka message: ${error.message}`,
          error.stack,
          'KafkaService',
        );
      } else if (error instanceof Error) {
        this.logger.error(
          `Unknown error emitting Kafka message: ${error.message}`,
          error.stack,
          'KafkaService',
        );
      } else {
        this.logger.error(
          'Unknown error occurred while emitting Kafka message',
          '',
          'KafkaService',
        );
      }
      throw error; // Re-throw the error so the calling service can handle it
    }
  }
}
