import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly userRegistrationCounter: Counter;
  private readonly loginAttemptCounter: Counter;

  constructor() {
    this.registry = new Registry();

    this.userRegistrationCounter = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
    });

    this.loginAttemptCounter = new Counter({
      name: 'login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['status'],
    });

    this.registry.registerMetric(this.userRegistrationCounter);
    this.registry.registerMetric(this.loginAttemptCounter);
  }

  incrementUserRegistration() {
    this.userRegistrationCounter.inc();
  }

  incrementLoginAttempt(status: 'success' | 'failure') {
    this.loginAttemptCounter.labels(status).inc();
  }

  getMetrics() {
    return this.registry.metrics();
  }
}
