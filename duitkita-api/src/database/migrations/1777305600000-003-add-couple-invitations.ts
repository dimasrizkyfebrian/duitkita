import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoupleInvitations1777305600000 implements MigrationInterface {
  name = 'AddCoupleInvitations1777305600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."couple_invitations_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "couple_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sender_user_id" uuid NOT NULL, "receiver_user_id" uuid NOT NULL, "status" "public"."couple_invitations_status_enum" NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP NOT NULL, "responded_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_96f769a18ab689aeab087d5c8f1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4fd6fd22d15d4c38515c338de8" ON "couple_invitations" ("sender_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_818fbd177aa5f86f7da3f9f6cc" ON "couple_invitations" ("receiver_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pending_invitation_pair" ON "couple_invitations" ("sender_user_id", "receiver_user_id") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "couple_invitations" ADD CONSTRAINT "FK_4fd6fd22d15d4c38515c338de81" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "couple_invitations" ADD CONSTRAINT "FK_818fbd177aa5f86f7da3f9f6ccf" FOREIGN KEY ("receiver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "couple_invitations" DROP CONSTRAINT "FK_818fbd177aa5f86f7da3f9f6ccf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "couple_invitations" DROP CONSTRAINT "FK_4fd6fd22d15d4c38515c338de81"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_pending_invitation_pair"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_818fbd177aa5f86f7da3f9f6cc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4fd6fd22d15d4c38515c338de8"`);
    await queryRunner.query(`DROP TABLE "couple_invitations"`);
    await queryRunner.query(`DROP TYPE "public"."couple_invitations_status_enum"`);
  }
}
