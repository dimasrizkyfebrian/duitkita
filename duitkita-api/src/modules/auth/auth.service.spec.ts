import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { SecurityAuditService } from '../security-audit/security-audit.service';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid',
    name: 'Dimas',
    email: 'dimas@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }) as User;

const makeSession = (overrides: Partial<UserSession> = {}): UserSession =>
  ({
    id: 'session-uuid',
    userId: 'user-uuid',
    refreshTokenHash: 'hashed_refresh',
    deviceName: 'Mac',
    ipAddress: '127.0.0.1',
    userAgent: 'Jest',
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as UserSession;

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const sessionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    signAsync: jest.fn().mockResolvedValue('mock.refresh.token'),
    verifyAsync: jest.fn(),
  };
  const securityAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    transaction: jest.fn((callback) =>
      callback({
        getRepository: (entity: unknown) =>
          entity === User ? userRepo : sessionRepo,
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserSession), useValue: sessionRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: JwtService, useValue: jwtService },
        { provide: SecurityAuditService, useValue: securityAuditService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      name: 'Dimas',
      email: 'dimas@example.com',
      password: 'secret',
    };

    it('creates a user and returns an access token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const user = makeUser();
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);
      sessionRepo.create.mockReturnValue(makeSession());
      sessionRepo.save.mockResolvedValue(makeSession());

      const result = await service.register(dto);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: dto.name, email: dto.email }),
      );
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.refresh.token');
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
      sessionRepo.create.mockReturnValue(makeSession());
      sessionRepo.save.mockResolvedValue(makeSession());

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
      sessionRepo.create.mockReturnValue(makeSession());
      sessionRepo.save.mockResolvedValue(makeSession());

      const result = await service.login(dto);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.refresh.token');
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

  describe('refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const plainRefresh = 'refresh.token.value';
      const hashedRefresh = await bcrypt.hash(plainRefresh, 10);
      const session = makeSession({ refreshTokenHash: hashedRefresh });
      const nextSession = makeSession({ id: 'session-next-uuid' });

      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-uuid',
        sid: 'session-uuid',
      });
      sessionRepo.findOne.mockResolvedValue(session);
      userRepo.findOne.mockResolvedValue(makeUser());
      sessionRepo.create.mockReturnValue(nextSession);
      sessionRepo.save.mockImplementation((entity: UserSession) =>
        Promise.resolve(entity),
      );

      const result = await service.refresh(plainRefresh);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.refresh.token');
      expect(result.sessionId).toBe('session-next-uuid');
    });

    it('throws unauthorized for invalid refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
      await expect(service.refresh('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
