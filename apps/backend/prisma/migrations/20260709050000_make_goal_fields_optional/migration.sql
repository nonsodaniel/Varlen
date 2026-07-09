-- Make goal fields optional with defaults
ALTER TABLE "goals" ALTER COLUMN "unit" SET DEFAULT 'units';
ALTER TABLE "goals" ALTER COLUMN "deadline" DROP NOT NULL;
ALTER TABLE "goals" ALTER COLUMN "color" SET DEFAULT '#3B82F6';
