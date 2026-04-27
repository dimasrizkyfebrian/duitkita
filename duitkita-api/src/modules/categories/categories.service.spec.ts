import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../../database/entities/category.entity';

const USER_ID = 'user-uuid';
const CAT_ID = 'cat-uuid';

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({
    id: CAT_ID,
    userId: USER_ID,
    name: 'Food',
    icon: '🍔',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }) as Category;

describe('CategoriesService', () => {
  let service: CategoriesService;

  const categoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and returns a category', async () => {
      const dto = { name: 'Food', icon: '🍔' };
      const category = makeCategory();
      categoryRepo.create.mockReturnValue(category);
      categoryRepo.save.mockResolvedValue(category);

      const result = await service.create(USER_ID, dto);

      expect(categoryRepo.create).toHaveBeenCalledWith({ ...dto, userId: USER_ID });
      expect(result).toEqual(category);
    });
  });

  describe('findAll', () => {
    it('returns all categories for the user', async () => {
      const categories = [makeCategory(), makeCategory({ id: 'cat-2', name: 'Transport' })];
      categoryRepo.find.mockResolvedValue(categories);

      const result = await service.findAll(USER_ID);

      expect(categoryRepo.find).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns the category when found', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);

      const result = await service.findOne(USER_ID, CAT_ID);

      expect(result).toEqual(category);
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'wrong-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates name and icon on the category', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.save.mockResolvedValue({ ...category, name: 'Dining' });

      const result = await service.update(USER_ID, CAT_ID, { name: 'Dining' });

      expect(categoryRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Dining');
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.update(USER_ID, 'bad-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ignores undefined fields and does not overwrite them', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.update(USER_ID, CAT_ID, { icon: undefined });

      const saved = categoryRepo.save.mock.calls[0][0] as Category;
      expect(saved.icon).toBe('🍔');
    });
  });

  describe('remove', () => {
    it('removes the category and returns its id', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove(USER_ID, CAT_ID);

      expect(categoryRepo.remove).toHaveBeenCalledWith(category);
      expect(result).toEqual({ id: CAT_ID });
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
