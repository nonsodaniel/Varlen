-- AlterTable: change budget category from enum to free-form string
ALTER TABLE "budgets" ALTER COLUMN "category" TYPE TEXT;
