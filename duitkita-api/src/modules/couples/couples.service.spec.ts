import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CouplesService } from './couples.service';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import {
  CoupleInvitation,
  CoupleInvitationStatus,
} from '../../database/entities/couple-invitation.entity';
import { CoupleMessages } from '../../common/constants/couple.messages';
import { SecurityAuditService } from '../security-audit/security-audit.service';

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

const makeCouple = (user1Id = USER_ID, user2Id = PARTNER_ID): Couple => ({
  id: 'couple-uuid',
  user1Id,
  user2Id,
  user1: makeUser({ id: user1Id }),
  user2: makeUser({
    id: user2Id,
    name: 'Partner',
    email: 'partner@example.com',
  }),
  linkedAt: new Date('2025-01-01'),
});

const makeInvitation = (
  overrides: Partial<CoupleInvitation> = {},
): CoupleInvitation => ({
  id: 'invitation-uuid',
  senderUserId: USER_ID,
  receiverUserId: PARTNER_ID,
  senderUser: makeUser(),
  receiverUser: makePartner(),
  status: CoupleInvitationStatus.PENDING,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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

  const invitationRepo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const securityAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    transaction: jest.fn((callback) =>
      callback({
        getRepository: (entity: unknown) => {
          if (entity === Couple) return coupleRepo;
          if (entity === CoupleInvitation) return invitationRepo;
          return userRepo;
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouplesService,
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        {
          provide: getRepositoryToken(CoupleInvitation),
          useValue: invitationRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: SecurityAuditService, useValue: securityAuditService },
      ],
    }).compile();

    service = module.get(CouplesService);
    jest.clearAllMocks();
  });

  describe('sendInvitation', () => {
    const dto = { partnerEmail: 'partner@example.com' };

    it('creates invitation when both users are available', async () => {
      userRepo.findOne.mockResolvedValue(makePartner());
      coupleRepo.findOne.mockResolvedValue(null);
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(makeInvitation());
      invitationRepo.save.mockResolvedValue(makeInvitation());
      invitationRepo.findOneOrFail.mockResolvedValue(makeInvitation());

      const result = await service.sendInvitation(USER_ID, dto);

      expect(invitationRepo.create).toHaveBeenCalled();
      expect(result.status).toBe(CoupleInvitationStatus.PENDING);
      expect(result.senderUserId).toBe(USER_ID);
      expect(result.receiverUserId).toBe(PARTNER_ID);
    });

    it('throws conflict when pending invitation already exists', async () => {
      userRepo.findOne.mockResolvedValue(makePartner());
      coupleRepo.findOne.mockResolvedValue(null);
      invitationRepo.findOne.mockResolvedValue(makeInvitation());

      await expect(service.sendInvitation(USER_ID, dto)).rejects.toThrow(
        new ConflictException(CoupleMessages.INVITATION_ALREADY_PENDING),
      );
    });
  });

  describe('acceptInvitation', () => {
    it('accepts invitation and creates a couple', async () => {
      const invitation = makeInvitation({
        receiverUserId: USER_ID,
        senderUserId: PARTNER_ID,
        senderUser: makeUser({
          id: PARTNER_ID,
          name: 'Partner',
          email: 'partner@example.com',
        }),
      });
      invitationRepo.findOne.mockResolvedValue(invitation);
      coupleRepo.findOne.mockResolvedValue(null);
      const savedCouple = makeCouple(PARTNER_ID, USER_ID);
      coupleRepo.create.mockReturnValue(savedCouple);
      coupleRepo.save.mockResolvedValue(savedCouple);
      invitationRepo.save.mockResolvedValue({
        ...invitation,
        status: CoupleInvitationStatus.ACCEPTED,
      });

      const result = await service.acceptInvitation(USER_ID, invitation.id);

      expect(coupleRepo.create).toHaveBeenCalledWith({
        user1Id: PARTNER_ID,
        user2Id: USER_ID,
      });
      expect(result.id).toBe(PARTNER_ID);
    });
  });

  describe('rejectInvitation', () => {
    it('rejects pending invitation', async () => {
      const invitation = makeInvitation({ receiverUserId: USER_ID });
      invitationRepo.findOne.mockResolvedValue(invitation);
      invitationRepo.save.mockResolvedValue({
        ...invitation,
        status: CoupleInvitationStatus.REJECTED,
      });

      const result = await service.rejectInvitation(USER_ID, invitation.id);

      expect(result.message).toBe(CoupleMessages.INVITATION_REJECTED);
    });
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
      await expect(service.link(USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
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
        .mockResolvedValueOnce(null) // user is free
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
      await expect(service.getPartner(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
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
