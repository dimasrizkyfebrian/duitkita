import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessions1777311000000 implements MigrationInterface {
  name = 'AddUserSessions1777311000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "refresh_token_hash" character varying NOT NULL, "device_name" character varying(120), "ip_address" character varying(64), "user_agent" character varying(255), "last_active_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_219cf6ff267c988d0ce5baabd84" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f0e52f4f1ee6ec56190f14b8d" ON "user_sessions" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_6f0e52f4f1ee6ec56190f14b8dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_6f0e52f4f1ee6ec56190f14b8dd"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_6f0e52f4f1ee6ec56190f14b8d"`);
    await queryRunner.query(`DROP TABLE "user_sessions"`);
  }
}
