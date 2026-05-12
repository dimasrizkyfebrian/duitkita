import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { SecurityAuditService } from '../security-audit/security-audit.service';

const USER_ID = 'user-uuid';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: USER_ID,
    name: 'Dimas',
    email: 'dimas@example.com',
    passwordHash: 'hashed',
    createdAt: new Date(),
    ...overrides,
  }) as User;

describe('UsersService', () => {
  let service: UsersService;

  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const authService = {
    revokeAllSessions: jest.fn(),
  };
  const securityAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    listForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: AuthService, useValue: authService },
        { provide: SecurityAuditService, useValue: securityAuditService },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns profile info without passwordHash', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.getProfile(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.name).toBe('Dimas');
      expect(result.email).toBe('dimas@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates the name and returns profile info', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.updateProfile(USER_ID, { name: 'NewName' });

      expect(result.name).toBe('NewName');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('leaves name unchanged when dto.name is undefined', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.updateProfile(USER_ID, {});

      expect(result.name).toBe('Dimas');
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.updateProfile('bad-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('changes password when current password matches', async () => {
      const user = makeUser({ passwordHash: await bcrypt.hash('oldpass', 10) });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'oldpass', newPassword: 'newpass123' }),
      ).resolves.toBeUndefined();

      expect(userRepo.save).toHaveBeenCalled();
      expect(authService.revokeAllSessions).toHaveBeenCalledWith(USER_ID);
      expect(securityAuditService.log).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when current password does not match', async () => {
      const user = makeUser({ passwordHash: await bcrypt.hash('correctpass', 10) });
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'wrongpass', newPassword: 'newpass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.changePassword('bad-id', { currentPassword: 'x', newPassword: 'yyyyyyyy' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
