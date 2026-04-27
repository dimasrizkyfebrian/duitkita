import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { ActivityService } from './activity.service';
import { Activity, ActivityAction, ActivityEntityType } from '../../database/entities/activity.entity';
import { Couple } from '../../database/entities/couple.entity';

const USER_ID = 'user-uuid';
const COUPLE_ID = 'couple-uuid';
const ENTITY_ID = 'expense-uuid';

const makeCouple = (): Couple =>
  ({ id: COUPLE_ID, user1Id: USER_ID, user2Id: 'partner-uuid' }) as Couple;

const makeActivity = (): Activity =>
  ({
    id: 'act-uuid',
    coupleId: COUPLE_ID,
    actorId: USER_ID,
    action: ActivityAction.CREATED,
    entityType: ActivityEntityType.EXPENSE,
    entityId: ENTITY_ID,
    meta: { amount: 50000 },
    createdAt: new Date('2025-08-01T10:00:00Z'),
    actor: { id: USER_ID, name: 'Dimas' },
  }) as unknown as Activity;

const logParams = {
  userId: USER_ID,
  action: ActivityAction.CREATED,
  entityType: ActivityEntityType.EXPENSE,
  entityId: ENTITY_ID,
  meta: { amount: 50000, categoryName: 'Food' },
};

describe('ActivityService', () => {
  let service: ActivityService;

  const activityRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  const coupleRepo = {
    findOne: jest.fn(),
  };

  const logger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: getRepositoryToken(Activity), useValue: activityRepo },
        { provide: getRepositoryToken(Couple), useValue: coupleRepo },
        { provide: getLoggerToken(ActivityService.name), useValue: logger },
      ],
    }).compile();

    service = module.get(ActivityService);
    jest.clearAllMocks();
  });

  // ─── log() ────────────────────────────────────────────────────────────────

  describe('log()', () => {
    it('creates and saves an activity record when the user has a couple', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      activityRepo.create.mockReturnValue(makeActivity());
      activityRepo.save.mockResolvedValue(makeActivity());

      await service.log(logParams);

      expect(activityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coupleId: COUPLE_ID,
          actorId: USER_ID,
          action: ActivityAction.CREATED,
          entityType: ActivityEntityType.EXPENSE,
          entityId: ENTITY_ID,
        }),
      );
      expect(activityRepo.save).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: USER_ID, coupleId: COUPLE_ID }),
        'activity:logged',
      );
    });

    it('silently returns and logs debug when the user has no couple', async () => {
      coupleRepo.findOne.mockResolvedValue(null);

      await service.log(logParams);

      expect(activityRepo.save).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID }),
        'activity:skipped — user has no couple',
      );
    });

    it('logs error and does not throw when save fails', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      activityRepo.create.mockReturnValue(makeActivity());
      activityRepo.save.mockRejectedValue(new Error('DB error'));

      await expect(service.log(logParams)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'activity:failed — could not save activity',
      );
    });
  });

  // ─── getFeed() ─────────────────────────────────────────────────────────────

  describe('getFeed()', () => {
    it('returns paginated activity feed for the couple', async () => {
      const activity = makeActivity();
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      activityRepo.findAndCount.mockResolvedValue([[activity], 1]);

      const result = await service.getFeed(USER_ID, 20, 0);

      expect(activityRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { coupleId: COUPLE_ID },
          take: 20,
          skip: 0,
        }),
      );
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.data[0]).toMatchObject({
        id: activity.id,
        actorId: USER_ID,
        actorName: 'Dimas',
        action: ActivityAction.CREATED,
        entityType: ActivityEntityType.EXPENSE,
      });
    });

    it('throws NotFoundException when the user has no couple', async () => {
      coupleRepo.findOne.mockResolvedValue(null);
      await expect(service.getFeed(USER_ID, 20, 0)).rejects.toThrow(NotFoundException);
    });

    it('returns empty data array with total 0 when the couple has no activity', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      activityRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getFeed(USER_ID, 5, 0);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('applies offset correctly for pagination', async () => {
      coupleRepo.findOne.mockResolvedValue(makeCouple());
      activityRepo.findAndCount.mockResolvedValue([[], 10]);

      await service.getFeed(USER_ID, 5, 5);

      expect(activityRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 5 }),
      );
    });
  });
});
