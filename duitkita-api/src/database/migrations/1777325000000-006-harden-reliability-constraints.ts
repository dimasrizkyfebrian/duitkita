import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenReliabilityConstraints1777325000000 implements MigrationInterface {
  name = '006HardenReliabilityConstraints1777325000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "couples" ALTER COLUMN "user1_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "couples" ALTER COLUMN "user2_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "couples" ADD CONSTRAINT "CHK_couples_not_self_link" CHECK ("user1_id" <> "user2_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_couples_normalized_pair" ON "couples" (LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id"))`,
    );
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_single_active_couple_per_user()
      RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "couples"
          WHERE "id" <> NEW."id"
            AND (
              "user1_id" = NEW."user1_id"
              OR "user1_id" = NEW."user2_id"
              OR "user2_id" = NEW."user1_id"
              OR "user2_id" = NEW."user2_id"
            )
        ) THEN
          RAISE unique_violation USING MESSAGE = 'user already has an active couple';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_single_active_couple_per_user"
      BEFORE INSERT OR UPDATE ON "couples"
      FOR EACH ROW EXECUTE FUNCTION enforce_single_active_couple_per_user()
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pending_invitation_unordered_pair" ON "couple_invitations" (LEAST("sender_user_id", "receiver_user_id"), GREATEST("sender_user_id", "receiver_user_id")) WHERE "status" = 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_pending_invitation_unordered_pair"`,
    );
    await queryRunner.query(
      `DROP TRIGGER "TRG_single_active_couple_per_user" ON "couples"`,
    );
    await queryRunner.query(
      `DROP FUNCTION enforce_single_active_couple_per_user`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_couples_normalized_pair"`);
    await queryRunner.query(
      `ALTER TABLE "couples" DROP CONSTRAINT "CHK_couples_not_self_link"`,
    );
    await queryRunner.query(
      `ALTER TABLE "couples" ALTER COLUMN "user2_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "couples" ALTER COLUMN "user1_id" DROP NOT NULL`,
    );
  }
}
