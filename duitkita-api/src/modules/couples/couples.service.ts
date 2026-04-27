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
import { LinkPartnerDto } from './dto/link-partner.dto';
import { CoupleMessages } from '../../common/constants/couple.messages';

export type PartnerInfo = {
  id: string;
  name: string;
  email: string;
  linkedAt: Date;
};

@Injectable()
export class CouplesService {
  constructor(
    @InjectRepository(Couple)
    private readonly coupleRepo: Repository<Couple>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

    await this.coupleRepo.remove(couple);
  }

  private async findCouple(userId: string): Promise<Couple | null> {
    return this.coupleRepo.findOne({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });
  }
}
