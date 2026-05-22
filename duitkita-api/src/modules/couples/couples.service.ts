import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Couple } from '../../database/entities/couple.entity';
import { User } from '../../database/entities/user.entity';
import {
  CoupleInvitation,
  CoupleInvitationStatus,
} from '../../database/entities/couple-invitation.entity';
import { LinkPartnerDto } from './dto/link-partner.dto';
import { CoupleMessages } from '../../common/constants/couple.messages';
import { SecurityAuditEventType } from '../../database/entities/security-audit-log.entity';
import { SecurityAuditService } from '../security-audit/security-audit.service';

export type PartnerInfo = {
  id: string;
  name: string;
  email: string;
  linkedAt: Date;
  hasAvatar: boolean;
};

export type InvitationInfo = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  receiverUserId: string;
  receiverName: string;
  receiverEmail: string;
  status: CoupleInvitationStatus;
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class CouplesService {
  constructor(
    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,

    @InjectRepository(CoupleInvitation)
    private readonly invitationRepo: Repository<CoupleInvitation>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async link(userId: string, dto: LinkPartnerDto): Promise<PartnerInfo> {
    const result = await this.dataSource.transaction(async (manager) => {
      const coupleRepo = manager.getRepository(Couple);
      const userRepo = manager.getRepository(User);
      const partner = await userRepo.findOne({
        where: { email: dto.partnerEmail },
      });
      if (!partner) {
        throw new NotFoundException(CoupleMessages.PARTNER_NOT_FOUND);
      }

      if (partner.id === userId) {
        throw new BadRequestException(CoupleMessages.CANNOT_LINK_SELF);
      }

      await this.ensureBothUsersAvailable(userId, partner.id, coupleRepo, true);

      const couple = coupleRepo.create({
        user1Id: userId,
        user2Id: partner.id,
      });
      const saved = await coupleRepo.save(couple);

      return {
        partnerInfo: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          linkedAt: saved.linkedAt,
          hasAvatar: !!partner.avatarStorageKey,
        },
        auditMeta: { partnerId: partner.id, coupleId: saved.id },
      };
    });

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.PARTNER_LINKED,
      meta: result.auditMeta,
    });

    return result.partnerInfo;
  }

  async getPartner(userId: string): Promise<PartnerInfo> {
    const couple = await this.findCouple(userId);
    if (!couple) {
      throw new NotFoundException(CoupleMessages.NOT_FOUND);
    }

    const partner = couple.user1Id === userId ? couple.user2 : couple.user1;

    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      linkedAt: couple.linkedAt,
      hasAvatar: !!partner.avatarStorageKey,
    };
  }

  async unlink(userId: string): Promise<void> {
    const result = await this.dataSource.transaction(async (manager) => {
      const coupleRepo = manager.getRepository(Couple);
      const couple = await this.findCouple(userId, coupleRepo, true);
      if (!couple) {
        throw new NotFoundException(CoupleMessages.NOT_FOUND);
      }

      const partnerId =
        couple.user1Id === userId ? couple.user2Id : couple.user1Id;
      await coupleRepo.remove(couple);
      return { coupleId: couple.id, partnerId };
    });

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.PARTNER_UNLINKED,
      meta: { coupleId: result.coupleId, partnerId: result.partnerId },
    });
  }

  async sendInvitation(
    userId: string,
    dto: LinkPartnerDto,
  ): Promise<InvitationInfo> {
    const result = await this.dataSource.transaction(async (manager) => {
      const coupleRepo = manager.getRepository(Couple);
      const invitationRepo = manager.getRepository(CoupleInvitation);
      const userRepo = manager.getRepository(User);
      const partner = await userRepo.findOne({
        where: { email: dto.partnerEmail },
      });
      if (!partner) {
        throw new NotFoundException(CoupleMessages.PARTNER_NOT_FOUND);
      }

      if (partner.id === userId) {
        throw new BadRequestException(CoupleMessages.CANNOT_LINK_SELF);
      }

      await this.ensureBothUsersAvailable(userId, partner.id, coupleRepo, true);

      const existingInvitation = await invitationRepo.findOne({
        where: [
          {
            senderUserId: userId,
            receiverUserId: partner.id,
            status: CoupleInvitationStatus.PENDING,
          },
          {
            senderUserId: partner.id,
            receiverUserId: userId,
            status: CoupleInvitationStatus.PENDING,
          },
        ],
      });

      if (existingInvitation) {
        if (existingInvitation.expiresAt <= new Date()) {
          await this.markInvitationExpired(existingInvitation, invitationRepo);
        } else {
          throw new ConflictException(
            CoupleMessages.INVITATION_ALREADY_PENDING,
          );
        }
      }

      const invitation = invitationRepo.create({
        senderUserId: userId,
        receiverUserId: partner.id,
        status: CoupleInvitationStatus.PENDING,
        expiresAt: this.createInvitationExpiryDate(),
        respondedAt: null,
      });
      const savedInvitation = await invitationRepo.save(invitation);
      const populated = await invitationRepo.findOneOrFail({
        where: { id: savedInvitation.id },
      });

      return {
        invitationInfo: this.toInvitationInfo(populated),
        auditMeta: {
          invitationId: populated.id,
          receiverUserId: partner.id,
        },
      };
    });

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_SENT,
      meta: result.auditMeta,
    });

    return result.invitationInfo;
  }

  async getIncomingInvitations(userId: string): Promise<InvitationInfo[]> {
    const invitations = await this.invitationRepo.find({
      where: {
        receiverUserId: userId,
        status: CoupleInvitationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const activeInvitations = invitations.filter(
      (invitation) => invitation.expiresAt > now,
    );
    const expiredInvitations = invitations.filter(
      (invitation) => invitation.expiresAt <= now,
    );

    if (expiredInvitations.length > 0) {
      await this.invitationRepo.update(
        expiredInvitations.map((invitation) => invitation.id),
        {
          status: CoupleInvitationStatus.EXPIRED,
          respondedAt: now,
        },
      );
    }

    return activeInvitations.map((invitation) =>
      this.toInvitationInfo(invitation),
    );
  }

  async acceptInvitation(
    userId: string,
    invitationId: string,
  ): Promise<PartnerInfo> {
    const result = await this.dataSource.transaction(async (manager) => {
      const coupleRepo = manager.getRepository(Couple);
      const invitationRepo = manager.getRepository(CoupleInvitation);
      const invitation = await invitationRepo.findOne({
        where: { id: invitationId, receiverUserId: userId },
      });
      if (!invitation) {
        throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
      }
      this.ensureInvitationPending(invitation);

      if (invitation.expiresAt <= new Date()) {
        await this.markInvitationExpired(invitation, invitationRepo);
        return { error: new BadRequestException(CoupleMessages.INVITATION_EXPIRED) };
      }

      await this.ensureBothUsersAvailable(
        invitation.senderUserId,
        invitation.receiverUserId,
        coupleRepo,
        true,
      );

      const couple = coupleRepo.create({
        user1Id: invitation.senderUserId,
        user2Id: invitation.receiverUserId,
      });
      const savedCouple = await coupleRepo.save(couple);

      invitation.status = CoupleInvitationStatus.ACCEPTED;
      invitation.respondedAt = new Date();
      await invitationRepo.save(invitation);

      return {
        partnerInfo: {
          id: invitation.senderUser.id,
          name: invitation.senderUser.name,
          email: invitation.senderUser.email,
          linkedAt: savedCouple.linkedAt,
          hasAvatar: !!invitation.senderUser.avatarStorageKey,
        },
        auditMeta: {
          invitationId: invitation.id,
          partnerUserId: invitation.senderUserId,
          coupleId: savedCouple.id,
        },
      };
    });

    if ('error' in result) {
      throw result.error;
    }

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_ACCEPTED,
      meta: result.auditMeta,
    });

    return result.partnerInfo;
  }

  async rejectInvitation(
    userId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    const result = await this.dataSource.transaction(async (manager) => {
      const invitationRepo = manager.getRepository(CoupleInvitation);
      const invitation = await invitationRepo.findOne({
        where: { id: invitationId, receiverUserId: userId },
      });
      if (!invitation) {
        throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
      }
      this.ensureInvitationPending(invitation);

      if (invitation.expiresAt <= new Date()) {
        await this.markInvitationExpired(invitation, invitationRepo);
        return { error: new BadRequestException(CoupleMessages.INVITATION_EXPIRED) };
      }

      invitation.status = CoupleInvitationStatus.REJECTED;
      invitation.respondedAt = new Date();
      await invitationRepo.save(invitation);
      return {
        auditMeta: {
          invitationId: invitation.id,
          senderUserId: invitation.senderUserId,
        },
      };
    });

    if ('error' in result) {
      throw result.error;
    }

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_REJECTED,
      meta: result.auditMeta,
    });

    return { message: CoupleMessages.INVITATION_REJECTED };
  }

  async cancelInvitation(
    userId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    const result = await this.dataSource.transaction(async (manager) => {
      const invitationRepo = manager.getRepository(CoupleInvitation);
      const invitation = await invitationRepo.findOne({
        where: { id: invitationId, senderUserId: userId },
      });
      if (!invitation) {
        throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
      }
      this.ensureInvitationPending(invitation);

      if (invitation.expiresAt <= new Date()) {
        await this.markInvitationExpired(invitation, invitationRepo);
        return { error: new BadRequestException(CoupleMessages.INVITATION_EXPIRED) };
      }

      invitation.status = CoupleInvitationStatus.CANCELLED;
      invitation.respondedAt = new Date();
      await invitationRepo.save(invitation);
      return {
        auditMeta: {
          invitationId: invitation.id,
          receiverUserId: invitation.receiverUserId,
        },
      };
    });

    if ('error' in result) {
      throw result.error;
    }

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_CANCELLED,
      meta: result.auditMeta,
    });

    return { message: CoupleMessages.INVITATION_CANCELLED };
  }

  private ensureInvitationPending(invitation: CoupleInvitation): void {
    if (invitation.status !== CoupleInvitationStatus.PENDING) {
      throw new ConflictException(CoupleMessages.INVITATION_NOT_PENDING);
    }
  }

  private createInvitationExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private async ensureBothUsersAvailable(
    userId: string,
    partnerId: string,
    coupleRepo: Repository<Couple> = this.coupleRepo,
    lock = false,
  ): Promise<void> {
    const myCouple = await this.findCouple(userId, coupleRepo, lock);
    if (myCouple) {
      throw new ConflictException(CoupleMessages.ALREADY_LINKED);
    }

    const partnerCouple = await this.findCouple(partnerId, coupleRepo, lock);
    if (partnerCouple) {
      throw new ConflictException(CoupleMessages.PARTNER_ALREADY_LINKED);
    }
  }

  private async markInvitationExpired(
    invitation: CoupleInvitation,
    invitationRepo: Repository<CoupleInvitation> = this.invitationRepo,
  ): Promise<void> {
    invitation.status = CoupleInvitationStatus.EXPIRED;
    invitation.respondedAt = new Date();
    await invitationRepo.save(invitation);
  }

  private toInvitationInfo(invitation: CoupleInvitation): InvitationInfo {
    return {
      id: invitation.id,
      senderUserId: invitation.senderUserId,
      senderName: invitation.senderUser.name,
      senderEmail: invitation.senderUser.email,
      receiverUserId: invitation.receiverUserId,
      receiverName: invitation.receiverUser.name,
      receiverEmail: invitation.receiverUser.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      respondedAt: invitation.respondedAt,
      createdAt: invitation.createdAt,
    };
  }

  private async findCouple(
    userId: string,
    coupleRepo: Repository<Couple> = this.coupleRepo,
    _lock = false,
  ): Promise<Couple | null> {
    return coupleRepo.findOne({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });
  }
}
