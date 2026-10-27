-- Allow multiple meals per slot by removing the unique constraint
ALTER TABLE "meal_plans" DROP CONSTRAINT IF EXISTS "meal_plans_householdId_date_mealType_key";
-- Add a composite index for query performance
CREATE INDEX IF NOT EXISTS "meal_plans_householdId_date_mealType_idx" ON "meal_plans"("householdId", "date", "mealType");
