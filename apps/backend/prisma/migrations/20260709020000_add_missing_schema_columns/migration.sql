-- Create missing enums
CREATE TYPE "CircleType" AS ENUM ('PRIMARY', 'EXTENDED', 'FRIENDS', 'CUSTOM');
CREATE TYPE "Visibility" AS ENUM ('CIRCLE_ONLY', 'PRIVATE', 'CUSTOM');
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT', 'ADMIN');

-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN "primaryCircleId" TEXT;

-- Add missing columns to households table
ALTER TABLE "households" ADD COLUMN "type" "CircleType" NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE "households" ADD COLUMN "emoji" TEXT;
ALTER TABLE "households" ADD COLUMN "color" TEXT;
ALTER TABLE "households" ADD COLUMN "description" TEXT;
ALTER TABLE "households" ADD COLUMN "createdById" TEXT;

-- Add visibility column to all tables that need it
ALTER TABLE "calendar_events" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "tasks" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "shopping_lists" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "expenses" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "memories" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "polls" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "goals" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "timeline_entries" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "routines" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "countdowns" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY';

-- Create meals table
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "ingredients" JSONB NOT NULL DEFAULT '[]',
    "prepTime" INTEGER,
    "servings" INTEGER,
    "emoji" TEXT NOT NULL DEFAULT '',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'CIRCLE_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meals_householdId_idx" ON "meals"("householdId");
ALTER TABLE "meals" ADD CONSTRAINT "meals_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create meal_plans table
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "mealId" TEXT,
    "customTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "meal_plans_householdId_date_mealType_key" ON "meal_plans"("householdId", "date", "mealType");
CREATE INDEX "meal_plans_householdId_idx" ON "meal_plans"("householdId");
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create item_shares table
CREATE TABLE "item_shares" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "circleId" TEXT,
    "userId" TEXT,
    "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
    "sharedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_shares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "item_shares_entityType_entityId_circleId_key" ON "item_shares"("entityType", "entityId", "circleId");
CREATE UNIQUE INDEX "item_shares_entityType_entityId_userId_key" ON "item_shares"("entityType", "entityId", "userId");
CREATE INDEX "item_shares_entityType_entityId_idx" ON "item_shares"("entityType", "entityId");
CREATE INDEX "item_shares_circleId_idx" ON "item_shares"("circleId");
CREATE INDEX "item_shares_userId_idx" ON "item_shares"("userId");
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
