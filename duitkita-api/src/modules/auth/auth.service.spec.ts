import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid',
    name: 'Dimas',
    email: 'dimas@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('mock.jwt.token') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { name: 'Dimas', email: 'dimas@example.com', password: 'secret' };

    it('creates a user and returns an access token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const user = makeUser();
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.register(dto);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: dto.name, email: dto.email }),
      );
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe(dto.email);
    });

    it('throws ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('hashes the password before saving', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const user = makeUser();
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.register(dto);

      const [{ passwordHash }] = userRepo.create.mock.calls[0];
      expect(passwordHash).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, passwordHash);
      expect(isHashed).toBe(true);
    });
  });

  describe('login', () => {
    const dto = { email: 'dimas@example.com', password: 'secret' };

    it('returns an access token for valid credentials', async () => {
      const hash = await bcrypt.hash('secret', 10);
      userRepo.findOne.mockResolvedValue(makeUser({ passwordHash: hash }));

      const result = await service.login(dto);

      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('throws UnauthorizedException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('other_password', 10);
      userRepo.findOne.mockResolvedValue(makeUser({ passwordHash: hash }));
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
