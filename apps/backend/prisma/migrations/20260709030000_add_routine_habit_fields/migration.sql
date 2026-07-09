-- Make existing required columns optional with defaults
ALTER TABLE "routines" ALTER COLUMN "time" SET DEFAULT '';
ALTER TABLE "routines" ALTER COLUMN "assignedToId" DROP NOT NULL;
ALTER TABLE "routines" ALTER COLUMN "category" SET DEFAULT 'general';

-- Add new columns for habit support
ALTER TABLE "routines" ADD COLUMN "emoji" TEXT;
ALTER TABLE "routines" ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE "routines" ADD COLUMN "color" TEXT;
ALTER TABLE "routines" ADD COLUMN "createdById" TEXT;
