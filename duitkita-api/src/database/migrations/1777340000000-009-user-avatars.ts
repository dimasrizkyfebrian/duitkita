import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatars1777340000000 implements MigrationInterface {
  name = 'UserAvatars1777340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "avatar_storage_key" character varying(512)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "avatar_storage_key"
    `);
  }
}
