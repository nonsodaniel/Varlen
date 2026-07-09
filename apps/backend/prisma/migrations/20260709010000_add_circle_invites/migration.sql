-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "circle_invites" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "invitedUserId" TEXT,
    "invitedEmail" TEXT,
    "invitedPhone" TEXT,
    "role" "HouseholdRole" NOT NULL DEFAULT 'FAMILY',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "circle_invites_token_key" ON "circle_invites"("token");

-- CreateIndex
CREATE INDEX "circle_invites_circleId_idx" ON "circle_invites"("circleId");

-- CreateIndex
CREATE INDEX "circle_invites_invitedUserId_idx" ON "circle_invites"("invitedUserId");

-- CreateIndex
CREATE INDEX "circle_invites_invitedEmail_idx" ON "circle_invites"("invitedEmail");

-- CreateIndex
CREATE INDEX "circle_invites_invitedPhone_idx" ON "circle_invites"("invitedPhone");

-- CreateIndex
CREATE INDEX "circle_invites_token_idx" ON "circle_invites"("token");

-- CreateIndex
CREATE INDEX "circle_invites_status_idx" ON "circle_invites"("status");

-- AddForeignKey
ALTER TABLE "circle_invites" ADD CONSTRAINT "circle_invites_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
