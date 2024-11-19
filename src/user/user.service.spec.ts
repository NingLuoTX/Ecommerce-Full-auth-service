import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaService } from '../kafka/kafka.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: KafkaService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and emit an event', async () => {
      const userData = { email: 'test@example.com', password: 'password' };
      const createdUser = { id: '1', ...userData };

      (prismaService.user.create as jest.Mock).mockResolvedValue(createdUser);

      await service.create(userData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(kafkaService.emit).toHaveBeenCalledWith('user_registered', {
        id: createdUser.id,
        email: createdUser.email,
      });
    });
  });
});
