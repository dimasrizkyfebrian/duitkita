import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Activity, ActivityAction, ActivityEntityType } from '../../database/entities/activity.entity';
import { Couple } from '../../database/entities/couple.entity';
import { ActivityMessages } from '../../common/constants/activity.messages';

export type ActivityLogParams = {
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  meta: Record<string, unknown>;
};

export type ActivityItem = {
  id: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: Date;
};

export type ActivityFeedResult = {
  data: ActivityItem[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class ActivityService {
  constructor(
    @InjectPinoLogger(ActivityService.name)
    private readonly logger: PinoLogger,

    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,

    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,
  ) {}

  async log(params: ActivityLogParams): Promise<void> {
    const { userId, action, entityType, entityId, meta } = params;
    try {
      const couple = await this.coupleRepo.findOne({
        where: [{ user1Id: userId }, { user2Id: userId }],
      });

      if (!couple) {
        this.logger.debug(
          { userId, action, entityType },
          'activity:skipped — user has no couple',
        );
        return;
      }

      const activity = this.activityRepo.create({
        coupleId: couple.id,
        actorId: userId,
        action,
        entityType,
        entityId,
        meta,
      });
      await this.activityRepo.save(activity);

      this.logger.info(
        { actorId: userId, coupleId: couple.id, action, entityType, entityId },
        'activity:logged',
      );
    } catch (err) {
      this.logger.error(
        { err, userId, action, entityType },
        'activity:failed — could not save activity',
      );
    }
  }

  async getFeed(userId: string, limit: number, offset: number): Promise<ActivityFeedResult> {
    const couple = await this.coupleRepo.findOne({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });
    if (!couple) {
      throw new NotFoundException(ActivityMessages.NO_PARTNER);
    }

    const [activities, total] = await this.activityRepo.findAndCount({
      where: { coupleId: couple.id },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: activities.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        actorName: a.actor.name,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        meta: a.meta,
        createdAt: a.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }
}
