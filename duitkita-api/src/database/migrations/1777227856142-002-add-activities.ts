import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivities1777227856142 implements MigrationInterface {
    name = 'AddActivities1777227856142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."activities_action_enum" AS ENUM('created', 'updated', 'deleted')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_entity_type_enum" AS ENUM('expense', 'budget')`);
        await queryRunner.query(`CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "couple_id" uuid NOT NULL, "actor_id" uuid NOT NULL, "action" "public"."activities_action_enum" NOT NULL, "entity_type" "public"."activities_entity_type_enum" NOT NULL, "entity_id" character varying NOT NULL, "meta" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_52bdafaefe840cf4442a1a65d0" ON "activities" ("couple_id") `);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_95b8018670e9fb47eed45f30533"`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc"`);
        await queryRunner.query(`ALTER TABLE "couples" ALTER COLUMN "user1_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "couples" ALTER COLUMN "user2_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_49a0ca239d34e74fdc4e0625a7" ON "expenses" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb3ec3e313ea648f744caf31f0" ON "expenses" ("monthly_budget_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fe39a24be568bdb4292aa55c5b" ON "expenses" ("expense_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_60c6870b5e70ddacfb155b7f5e" ON "monthly_budgets" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2296b7fe012d95646fa41921c8" ON "categories" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_95b8018670e9fb47eed45f3053" ON "couples" ("user1_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd90178fb02d8854f7fd403d0c" ON "couples" ("user2_id") `);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "UQ_119605e008d562cfdecd83c1ead" UNIQUE ("user1_id", "user2_id")`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_95b8018670e9fb47eed45f30533" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_52bdafaefe840cf4442a1a65d0d" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_78e06b2e7a3bd9b9239de4aa285" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_78e06b2e7a3bd9b9239de4aa285"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_52bdafaefe840cf4442a1a65d0d"`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc"`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_95b8018670e9fb47eed45f30533"`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "UQ_119605e008d562cfdecd83c1ead"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd90178fb02d8854f7fd403d0c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95b8018670e9fb47eed45f3053"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2296b7fe012d95646fa41921c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60c6870b5e70ddacfb155b7f5e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe39a24be568bdb4292aa55c5b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cb3ec3e313ea648f744caf31f0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49a0ca239d34e74fdc4e0625a7"`);
        await queryRunner.query(`ALTER TABLE "couples" ALTER COLUMN "user2_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "couples" ALTER COLUMN "user1_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_95b8018670e9fb47eed45f30533" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" DROP COLUMN "created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52bdafaefe840cf4442a1a65d0"`);
        await queryRunner.query(`DROP TABLE "activities"`);
        await queryRunner.query(`DROP TYPE "public"."activities_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_action_enum"`);
    }

}
