import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryMessages } from '../../common/constants/category.messages';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  create(userId: string, dto: CreateCategoryDto) {
    const category = this.categoryRepository.create({ ...dto, userId });
    return this.categoryRepository.save(category);
  }

  findAll(userId: string) {
    return this.categoryRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.categoryRepository.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException(CategoryMessages.NOT_FOUND);
    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, id);
    const defined = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    Object.assign(category, defined);
    return this.categoryRepository.save(category);
  }

  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);
    await this.categoryRepository.remove(category);
    return { id };
  }
}
