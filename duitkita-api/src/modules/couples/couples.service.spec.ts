import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CouplesService } from './couples.service';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import { CoupleMessages } from '../../common/constants/couple.messages';

const USER_ID = 'user-uuid';
const PARTNER_ID = 'partner-uuid';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: USER_ID,
    name: 'Dimas',
    email: 'dimas@example.com',
    passwordHash: 'hash',
    createdAt: new Date(),
    ...overrides,
  }) as User;

const makePartner = (): User =>
  makeUser({ id: PARTNER_ID, name: 'Partner', email: 'partner@example.com' });

const makeCouple = (user1Id = USER_ID, user2Id = PARTNER_ID): Couple =>
  ({
    id: 'couple-uuid',
    user1Id,
    user2Id,
    user1: makeUser({ id: user1Id }),
    user2: makeUser({ id: user2Id, name: 'Partner', email: 'partner@example.com' }),
    linkedAt: new Date('2025-01-01'),
  }) as Couple;

describe('CouplesService', () => {
  let service: CouplesService;

  const coupleRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouplesService,
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(CouplesService);
    jest.clearAllMocks();
  });

  // ─── link ───────────────────────────────────────────────────────────────────

  describe('link', () => {
    const dto = { partnerEmail: 'partner@example.com' };

    it('creates a couple and returns partner info', async () => {
      userRepo.findOne.mockResolvedValue(makePartner());
      coupleRepo.findOne.mockResolvedValue(null); // neither user is linked
      const couple = makeCouple();
      coupleRepo.create.mockReturnValue(couple);
      coupleRepo.save.mockResolvedValue(couple);

      const result = await service.link(USER_ID, dto);

      expect(coupleRepo.create).toHaveBeenCalledWith({
        user1Id: USER_ID,
        user2Id: PARTNER_ID,
      });
      expect(result.id).toBe(PARTNER_ID);
      expect(result.email).toBe('partner@example.com');
      expect(result.linkedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when partner email does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.link(USER_ID, dto)).rejects.toThrow(NotFoundException);
      await expect(service.link(USER_ID, dto)).rejects.toThrow(
        CoupleMessages.PARTNER_NOT_FOUND,
      );
    });

    it('throws BadRequestException when trying to link with oneself', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: USER_ID }));
      await expect(
        service.link(USER_ID, { partnerEmail: 'dimas@example.com' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.link(USER_ID, { partnerEmail: 'dimas@example.com' }),
      ).rejects.toThrow(CoupleMessages.CANNOT_LINK_SELF);
    });

    it('throws ConflictException when current user is already linked', async () => {
      userRepo.findOne.mockResolvedValue(makePartner());
      coupleRepo.findOne.mockResolvedValue(makeCouple()); // user already in couple
      await expect(service.link(USER_ID, dto)).rejects.toThrow(
        new ConflictException(CoupleMessages.ALREADY_LINKED),
      );
    });

    it('throws ConflictException when partner is already linked to someone else', async () => {
      userRepo.findOne.mockResolvedValue(makePartner());
      coupleRepo.findOne
        .mockResolvedValueOnce(null)                              // user is free
        .mockResolvedValueOnce(makeCouple(PARTNER_ID, 'third')); // partner is taken
      await expect(service.link(USER_ID, dto)).rejects.toThrow(
        new ConflictException(CoupleMessages.PARTNER_ALREADY_LINKED),
      );
    });
  });

  // ─── getPartner ─────────────────────────────────────────────────────────────

  describe('getPartner', () => {
    it('returns partner info when user is user1', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple(USER_ID, PARTNER_ID));

      const result = await service.getPartner(USER_ID);

      expect(result.id).toBe(PARTNER_ID);
      expect(result.name).toBe('Partner');
    });

    it('returns partner info when user is user2', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple(PARTNER_ID, USER_ID));

      const result = await service.getPartner(USER_ID);

      expect(result.id).toBe(PARTNER_ID);
    });

    it('throws NotFoundException when user is not linked to anyone', async () => {
      coupleRepo.findOne.mockResolvedValue(null);
      await expect(service.getPartner(USER_ID)).rejects.toThrow(NotFoundException);
      await expect(service.getPartner(USER_ID)).rejects.toThrow(
        CoupleMessages.NOT_FOUND,
      );
    });
  });

  // ─── unlink ─────────────────────────────────────────────────────────────────

  describe('unlink', () => {
    it('removes the couple record', async () => {
      const couple = makeCouple();
      coupleRepo.findOne.mockResolvedValue(couple);
      coupleRepo.remove.mockResolvedValue(undefined);

      await service.unlink(USER_ID);

      expect(coupleRepo.remove).toHaveBeenCalledWith(couple);
    });

    it('throws NotFoundException when user is not linked', async () => {
      coupleRepo.findOne.mockResolvedValue(null);
      await expect(service.unlink(USER_ID)).rejects.toThrow(NotFoundException);
      await expect(service.unlink(USER_ID)).rejects.toThrow(
        CoupleMessages.NOT_FOUND,
      );
    });
  });
});
