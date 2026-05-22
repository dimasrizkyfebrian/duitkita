import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportExports1777335000000 implements MigrationInterface {
  name = 'ReportExports1777335000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."report_exports_format_enum" AS ENUM('pdf')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_exports_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "report_exports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "format" "public"."report_exports_format_enum" NOT NULL, "year" integer NOT NULL, "month" integer NOT NULL, "scope" character varying(16) NOT NULL, "status" "public"."report_exports_status_enum" NOT NULL DEFAULT 'pending', "file_path" character varying(512), "error_message" text, "requested_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, "expires_at" TIMESTAMP, CONSTRAINT "PK_report_exports" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_report_exports_user_id" ON "report_exports" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_report_exports_user_status" ON "report_exports" ("user_id", "status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_exports" ADD CONSTRAINT "FK_report_exports_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_exports" DROP CONSTRAINT "FK_report_exports_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_report_exports_user_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_report_exports_user_id"`);
    await queryRunner.query(`DROP TABLE "report_exports"`);
    await queryRunner.query(`DROP TYPE "public"."report_exports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."report_exports_format_enum"`);
  }
}
