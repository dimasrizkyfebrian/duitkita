# DuitKita — Backend Setup Instructions

> Jalankan instruksi ini secara berurutan menggunakan Claude Code di terminal.
> Stack: NestJS + TypeORM + PostgreSQL (Supabase)

---

## Step 1 — Scaffold NestJS Project

```bash
pnpm i -g @nestjs/cli
nest new duitkita-api --package-manager pnpm
cd duitkita-api
```

Saat ditanya package manager, pilih **pnpm**.

---

## Step 2 — Install Dependencies

```bash
# TypeORM + PostgreSQL driver
pnpm install @nestjs/typeorm typeorm pg

# Auth & security
pnpm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
pnpm install -D @types/passport-jwt @types/bcryptjs

# Validation
pnpm install class-validator class-dto @nestjs/config
pnpm install class-transformer

# Config management
pnpm install @nestjs/config
```

---

## Step 3 — Setup Environment File

Buat file `.env` di root project `duitkita-api/`:

```bash
cat > .env << 'EOF'
# Ambil dari Supabase Dashboard > Project Settings > Database > Connection string (URI mode)
# Ganti [YOUR-PASSWORD] dengan password database kamu
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# JWT — ganti dengan random string yang panjang
JWT_SECRET=duitkita_super_secret_jwt_key_ganti_ini_dengan_random_string_panjang
JWT_EXPIRES_IN=7d

# App
PORT=3001
NODE_ENV=development
EOF
```

Buat juga `.env.example` (untuk git):

```bash
cat > .env.example << 'EOF'
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
EOF
```

Tambahkan `.env` ke `.gitignore`:

```bash
echo ".env" >> .gitignore
```

---

## Step 4 — Buat Semua Entity TypeORM

### 4a. Buat folder entities

```bash
mkdir -p src/entities
```

### 4b. Entity: User

```bash
cat > src/entities/user.entity.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Category } from './category.entity';
import { MonthlyBudget } from './monthly-budget.entity';
import { Expense } from './expense.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @OneToMany(() => MonthlyBudget, (budget) => budget.user)
  monthlyBudgets: MonthlyBudget[];

  @OneToMany(() => Expense, (expense) => expense.user)
  expenses: Expense[];
}
EOF
```

### 4c. Entity: Couple

```bash
cat > src/entities/couple.entity.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('couples')
export class Couple {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt: Date;
}
EOF
```

### 4d. Entity: Category

```bash
cat > src/entities/category.entity.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { MonthlyBudget } from './monthly-budget.entity';
import { Expense } from './expense.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.categories)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 10, nullable: true })
  icon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => MonthlyBudget, (budget) => budget.category)
  monthlyBudgets: MonthlyBudget[];

  @OneToMany(() => Expense, (expense) => expense.category)
  expenses: Expense[];
}
EOF
```

### 4e. Entity: MonthlyBudget

```bash
cat > src/entities/monthly-budget.entity.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Expense } from './expense.entity';

@Entity('monthly_budgets')
@Unique(['userId', 'categoryId', 'year', 'month'])
export class MonthlyBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.monthlyBudgets)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Category, (category) => category.monthlyBudgets)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  // Semua amount dalam satuan RUPIAH (integer, bukan float)
  @Column({ name: 'base_amount', type: 'bigint', default: 0 })
  baseAmount: number;

  @Column({ name: 'rollover_amount', type: 'bigint', default: 0 })
  rolloverAmount: number;

  // total_amount = base_amount + rollover_amount (dihitung saat rollover)
  @Column({ name: 'total_amount', type: 'bigint', default: 0 })
  totalAmount: number;

  @Column({ name: 'is_finalized', default: false })
  isFinalized: boolean;

  @OneToMany(() => Expense, (expense) => expense.monthlyBudget)
  expenses: Expense[];
}
EOF
```

### 4f. Entity: Expense

```bash
cat > src/entities/expense.entity.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { MonthlyBudget } from './monthly-budget.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.expenses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Category, (category) => category.expenses)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => MonthlyBudget, (budget) => budget.expenses)
  @JoinColumn({ name: 'monthly_budget_id' })
  monthlyBudget: MonthlyBudget;

  @Column({ name: 'monthly_budget_id' })
  monthlyBudgetId: string;

  // Amount dalam satuan RUPIAH (integer)
  @Column({ type: 'bigint' })
  amount: number;

  @Column({ length: 255, nullable: true })
  note: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
EOF
```

---

## Step 5 — Setup Migration Config

### 5a. Buat DataSource config (untuk CLI migration)

```bash
mkdir -p src/config

cat > src/config/database.config.ts << 'EOF'
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
EOF
```

### 5b. Buat JWT config

```bash
cat > src/config/jwt.config.ts << 'EOF'
export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
};
EOF
```

### 5c. Tambahkan scripts migration ke package.json

Buka `package.json` dan tambahkan scripts berikut di dalam `"scripts"`:

```json
"typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli",
"migration:generate": "npm run typeorm -- migration:generate -d src/config/database.config.ts",
"migration:run": "npm run typeorm -- migration:run -d src/config/database.config.ts",
"migration:revert": "npm run typeorm -- migration:revert -d src/config/database.config.ts"
```

Install ts-node dan tsconfig-paths jika belum ada:

```bash
pnpm install -D ts-node tsconfig-paths
```

---

## Step 6 — Update App Module

```bash
cat > src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Couple } from './entities/couple.entity';
import { Category } from './entities/category.entity';
import { MonthlyBudget } from './entities/monthly-budget.entity';
import { Expense } from './entities/expense.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: [User, Couple, Category, MonthlyBudget, Expense],
      migrations: ['dist/migrations/*.js'],
      synchronize: false,
    }),
  ],
})
export class AppModule {}
EOF
```

---

## Step 7 — Generate & Run Migration Pertama

```bash
# Buat folder migrations
mkdir -p src/migrations

# Generate migration dari entity yang sudah dibuat
pnpm run migration:generate -- src/migrations/001-initial-schema

# Jalankan migration ke Supabase
pnpm run migration:run
```

Jika berhasil, kamu akan melihat output seperti:

```
query: CREATE TABLE "users" (...)
query: CREATE TABLE "couples" (...)
...
Migration 001-initial-schema has been executed successfully.
```

---

## Step 8 — Verifikasi di Supabase

1. Buka Supabase Dashboard
2. Klik **Table Editor** di sidebar kiri
3. Pastikan tabel berikut sudah terbuat:
   - `users`
   - `couples`
   - `categories`
   - `monthly_budgets`
   - `expenses`
   - `migrations` (tabel internal TypeORM)

---

## Step 9 — Test Run App

```bash
pnpm run start:dev
```

Pastikan tidak ada error dan app berjalan di `http://localhost:3001`.

---

## Checklist

- [ ] NestJS project berhasil di-scaffold
- [ ] Semua dependency terinstall
- [ ] `.env` sudah diisi dengan `DATABASE_URL` dari Supabase
- [ ] 5 entity sudah dibuat di `src/entities/`
- [ ] Migration berhasil di-generate
- [ ] Migration berhasil di-run ke Supabase
- [ ] 5 tabel terlihat di Supabase Table Editor
- [ ] `npm run start:dev` berjalan tanpa error

---

## Troubleshooting

**Error: SSL connection required**
→ Pastikan `ssl: { rejectUnauthorized: false }` ada di config TypeORM. Supabase membutuhkan SSL.

**Error: password authentication failed**
→ Cek kembali `DATABASE_URL` di `.env`. Pastikan password sudah benar dan tidak ada karakter spesial yang tidak di-encode.

**Error: Cannot find module 'ts-node'**
→ Jalankan `npm install -D ts-node tsconfig-paths`

**Error: relation "users" already exists**
→ Tabel sudah ada. Cek di Supabase apakah migration sudah ter-run sebelumnya. Bisa jalankan `npm run migration:revert` dulu.

---

## Langkah Selanjutnya (setelah checklist selesai)

Setelah migration berhasil, step berikutnya adalah membangun module satu per satu dengan urutan:

1. `auth` module (register, login, JWT guard)
2. `categories` module (CRUD kategori per user)
3. `budgets` module (set budget bulanan + logika rollover)
4. `expenses` module (input pengeluaran)
5. `reports` module (summary bulanan)
