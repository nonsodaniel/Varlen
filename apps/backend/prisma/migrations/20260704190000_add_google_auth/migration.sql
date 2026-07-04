-- AlterTable: make passwordHash optional for Google OAuth users
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: add Google OAuth fields
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
