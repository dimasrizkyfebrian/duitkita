import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3ProductFeatures1777330100000 implements MigrationInterface {
  name = 'Phase3ProductFeatures1777330100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."recurring_expenses_schedule_type_enum" AS ENUM('weekly', 'monthly')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recurring_expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_id" uuid NOT NULL, "amount" bigint NOT NULL, "note" character varying(255), "schedule_type" "public"."recurring_expenses_schedule_type_enum" NOT NULL, "schedule_day" integer NOT NULL, "next_run_at" TIMESTAMP NOT NULL, "last_run_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_recurring_expenses" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recurring_expenses_user_id" ON "recurring_expenses" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recurring_expenses_next_run_at" ON "recurring_expenses" ("next_run_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_expenses" ADD CONSTRAINT "FK_recurring_expenses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_expenses" ADD CONSTRAINT "FK_recurring_expenses_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."bill_reminders_status_enum" AS ENUM('upcoming', 'overdue', 'done')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bill_reminders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "title" character varying(120) NOT NULL, "amount" bigint, "due_date" date NOT NULL, "remind_before_days" integer NOT NULL DEFAULT '1', "status" "public"."bill_reminders_status_enum" NOT NULL DEFAULT 'upcoming', "snoozed_until" date, "is_recurring" boolean NOT NULL DEFAULT false, "recurring_rule" character varying(64), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bill_reminders" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bill_reminders_user_id" ON "bill_reminders" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bill_reminders_due_date" ON "bill_reminders" ("due_date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_reminders" ADD CONSTRAINT "FK_bill_reminders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('recurring_expense', 'bill_reminder', 'budget_alert', 'partner_activity', 'weekly_summary')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying(160) NOT NULL, "body" text NOT NULL, "payload_json" jsonb, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("user_id", "is_read")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("user_id" uuid NOT NULL, "budget_alert" boolean NOT NULL DEFAULT true, "partner_activity" boolean NOT NULL DEFAULT true, "weekly_summary" boolean NOT NULL DEFAULT true, "reminder_alert" boolean NOT NULL DEFAULT true, "recurring_alert" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`,
    );
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_read"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "bill_reminders" DROP CONSTRAINT "FK_bill_reminders_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_bill_reminders_due_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bill_reminders_user_id"`);
    await queryRunner.query(`DROP TABLE "bill_reminders"`);
    await queryRunner.query(`DROP TYPE "public"."bill_reminders_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "recurring_expenses" DROP CONSTRAINT "FK_recurring_expenses_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_expenses" DROP CONSTRAINT "FK_recurring_expenses_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_recurring_expenses_next_run_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_recurring_expenses_user_id"`);
    await queryRunner.query(`DROP TABLE "recurring_expenses"`);
    await queryRunner.query(`DROP TYPE "public"."recurring_expenses_schedule_type_enum"`);
  }
}
