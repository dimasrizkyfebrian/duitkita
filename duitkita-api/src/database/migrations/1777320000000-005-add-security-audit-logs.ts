import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityAuditLogs1777320000000 implements MigrationInterface {
  name = 'AddSecurityAuditLogs1777320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."security_audit_logs_event_type_enum" AS ENUM('register_success', 'login_success', 'login_failure', 'password_changed', 'session_revoked', 'sessions_revoked_others', 'invitation_sent', 'invitation_accepted', 'invitation_rejected', 'invitation_cancelled', 'partner_linked', 'partner_unlinked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "security_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "event_type" "public"."security_audit_logs_event_type_enum" NOT NULL, "ip_address" character varying(64), "user_agent" character varying(255), "meta" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_security_audit_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_security_audit_logs_user_id" ON "security_audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_security_audit_logs_event_type" ON "security_audit_logs" ("event_type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "security_audit_logs" ADD CONSTRAINT "FK_security_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "security_audit_logs" DROP CONSTRAINT "FK_security_audit_logs_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_security_audit_logs_event_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_security_audit_logs_user_id"`);
    await queryRunner.query(`DROP TABLE "security_audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."security_audit_logs_event_type_enum"`);
  }
}
