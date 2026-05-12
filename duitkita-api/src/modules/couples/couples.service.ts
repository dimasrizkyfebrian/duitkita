import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async link(userId: string, dto: LinkPartnerDto): Promise<PartnerInfo> {
    const partner = await this.userRepo.findOne({
      where: { email: dto.partnerEmail },
    });
    if (!partner) {
      throw new NotFoundException(CoupleMessages.PARTNER_NOT_FOUND);
    }

    if (partner.id === userId) {
      throw new BadRequestException(CoupleMessages.CANNOT_LINK_SELF);
    }

    const myCouple = await this.findCouple(userId);
    if (myCouple) {
      throw new ConflictException(CoupleMessages.ALREADY_LINKED);
    }

    const partnerCouple = await this.findCouple(partner.id);
    if (partnerCouple) {
      throw new ConflictException(CoupleMessages.PARTNER_ALREADY_LINKED);
    }

    const couple = this.coupleRepo.create({
      user1Id: userId,
      user2Id: partner.id,
    });
    const saved = await this.coupleRepo.save(couple);

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.PARTNER_LINKED,
      meta: { partnerId: partner.id, coupleId: saved.id },
    });

    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      linkedAt: saved.linkedAt,
    };
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
    };
  }

  async unlink(userId: string): Promise<void> {
    const couple = await this.findCouple(userId);
    if (!couple) {
      throw new NotFoundException(CoupleMessages.NOT_FOUND);
    }

    const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;
    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.PARTNER_UNLINKED,
      meta: { coupleId: couple.id, partnerId },
    });

    await this.coupleRepo.remove(couple);
  }

  async sendInvitation(userId: string, dto: LinkPartnerDto): Promise<InvitationInfo> {
    const partner = await this.userRepo.findOne({
      where: { email: dto.partnerEmail },
    });
    if (!partner) {
      throw new NotFoundException(CoupleMessages.PARTNER_NOT_FOUND);
    }

    if (partner.id === userId) {
      throw new BadRequestException(CoupleMessages.CANNOT_LINK_SELF);
    }

    await this.ensureBothUsersAvailable(userId, partner.id);

    const existingInvitation = await this.invitationRepo.findOne({
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
        await this.markInvitationExpired(existingInvitation);
      } else {
        throw new ConflictException(CoupleMessages.INVITATION_ALREADY_PENDING);
      }
    }

    const invitation = this.invitationRepo.create({
      senderUserId: userId,
      receiverUserId: partner.id,
      status: CoupleInvitationStatus.PENDING,
      expiresAt: this.createInvitationExpiryDate(),
      respondedAt: null,
    });
    const savedInvitation = await this.invitationRepo.save(invitation);
    const populated = await this.invitationRepo.findOneOrFail({
      where: { id: savedInvitation.id },
    });

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_SENT,
      meta: {
        invitationId: populated.id,
        receiverUserId: partner.id,
      },
    });

    return this.toInvitationInfo(populated);
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
    const activeInvitations = invitations.filter((invitation) => invitation.expiresAt > now);
    const expiredInvitations = invitations.filter((invitation) => invitation.expiresAt <= now);

    if (expiredInvitations.length > 0) {
      await this.invitationRepo.update(
        expiredInvitations.map((invitation) => invitation.id),
        {
          status: CoupleInvitationStatus.EXPIRED,
          respondedAt: now,
        },
      );
    }

    return activeInvitations.map((invitation) => this.toInvitationInfo(invitation));
  }

  async acceptInvitation(userId: string, invitationId: string): Promise<PartnerInfo> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, receiverUserId: userId },
    });
    if (!invitation) {
      throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
    }
    this.ensureInvitationPending(invitation);

    if (invitation.expiresAt <= new Date()) {
      await this.markInvitationExpired(invitation);
      throw new BadRequestException(CoupleMessages.INVITATION_EXPIRED);
    }

    await this.ensureBothUsersAvailable(invitation.senderUserId, invitation.receiverUserId);

    const couple = this.coupleRepo.create({
      user1Id: invitation.senderUserId,
      user2Id: invitation.receiverUserId,
    });
    const savedCouple = await this.coupleRepo.save(couple);

    invitation.status = CoupleInvitationStatus.ACCEPTED;
    invitation.respondedAt = new Date();
    await this.invitationRepo.save(invitation);

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_ACCEPTED,
      meta: {
        invitationId: invitation.id,
        partnerUserId: invitation.senderUserId,
        coupleId: savedCouple.id,
      },
    });

    return {
      id: invitation.senderUser.id,
      name: invitation.senderUser.name,
      email: invitation.senderUser.email,
      linkedAt: savedCouple.linkedAt,
    };
  }

  async rejectInvitation(userId: string, invitationId: string): Promise<{ message: string }> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, receiverUserId: userId },
    });
    if (!invitation) {
      throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
    }
    this.ensureInvitationPending(invitation);

    if (invitation.expiresAt <= new Date()) {
      await this.markInvitationExpired(invitation);
      throw new BadRequestException(CoupleMessages.INVITATION_EXPIRED);
    }

    invitation.status = CoupleInvitationStatus.REJECTED;
    invitation.respondedAt = new Date();
    await this.invitationRepo.save(invitation);

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_REJECTED,
      meta: { invitationId: invitation.id, senderUserId: invitation.senderUserId },
    });

    return { message: CoupleMessages.INVITATION_REJECTED };
  }

  async cancelInvitation(userId: string, invitationId: string): Promise<{ message: string }> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, senderUserId: userId },
    });
    if (!invitation) {
      throw new NotFoundException(CoupleMessages.INVITATION_NOT_FOUND);
    }
    this.ensureInvitationPending(invitation);

    if (invitation.expiresAt <= new Date()) {
      await this.markInvitationExpired(invitation);
      throw new BadRequestException(CoupleMessages.INVITATION_EXPIRED);
    }

    invitation.status = CoupleInvitationStatus.CANCELLED;
    invitation.respondedAt = new Date();
    await this.invitationRepo.save(invitation);

    void this.securityAuditService.log({
      userId,
      eventType: SecurityAuditEventType.INVITATION_CANCELLED,
      meta: { invitationId: invitation.id, receiverUserId: invitation.receiverUserId },
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

  private async ensureBothUsersAvailable(userId: string, partnerId: string): Promise<void> {
    const myCouple = await this.findCouple(userId);
    if (myCouple) {
      throw new ConflictException(CoupleMessages.ALREADY_LINKED);
    }

    const partnerCouple = await this.findCouple(partnerId);
    if (partnerCouple) {
      throw new ConflictException(CoupleMessages.PARTNER_ALREADY_LINKED);
    }
  }

  private async markInvitationExpired(invitation: CoupleInvitation): Promise<void> {
    invitation.status = CoupleInvitationStatus.EXPIRED;
    invitation.respondedAt = new Date();
    await this.invitationRepo.save(invitation);
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

  private async findCouple(userId: string): Promise<Couple | null> {
    return this.coupleRepo.findOne({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });
  }
}
