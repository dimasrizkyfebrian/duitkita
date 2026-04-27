import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1777141794724 implements MigrationInterface {
    name = '001InitialSchema1777141794724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_id" uuid NOT NULL, "monthly_budget_id" uuid NOT NULL, "amount" bigint NOT NULL, "note" character varying(255), "expense_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "monthly_budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_id" uuid NOT NULL, "year" integer NOT NULL, "month" integer NOT NULL, "base_amount" bigint NOT NULL DEFAULT '0', "rollover_amount" bigint NOT NULL DEFAULT '0', "total_amount" bigint NOT NULL DEFAULT '0', "is_finalized" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_653b2d21017527b98216a184092" UNIQUE ("user_id", "category_id", "year", "month"), CONSTRAINT "PK_8dc0bc52b28641c6acda694484f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "icon" character varying(10), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "couples" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "linked_at" TIMESTAMP NOT NULL DEFAULT now(), "user1_id" uuid, "user2_id" uuid, CONSTRAINT "PK_bd7364cfee909d0cb1912bb25f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_49a0ca239d34e74fdc4e0625a78" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_cb3ec3e313ea648f744caf31f06" FOREIGN KEY ("monthly_budget_id") REFERENCES "monthly_budgets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" ADD CONSTRAINT "FK_60c6870b5e70ddacfb155b7f5e6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" ADD CONSTRAINT "FK_c7d7c0e35bf712e9d34700b34a3" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_95b8018670e9fb47eed45f30533" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "couples" ADD CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_dd90178fb02d8854f7fd403d0cc"`);
        await queryRunner.query(`ALTER TABLE "couples" DROP CONSTRAINT "FK_95b8018670e9fb47eed45f30533"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" DROP CONSTRAINT "FK_c7d7c0e35bf712e9d34700b34a3"`);
        await queryRunner.query(`ALTER TABLE "monthly_budgets" DROP CONSTRAINT "FK_60c6870b5e70ddacfb155b7f5e6"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_cb3ec3e313ea648f744caf31f06"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_49a0ca239d34e74fdc4e0625a78"`);
        await queryRunner.query(`DROP TABLE "couples"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "monthly_budgets"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
    }

}
