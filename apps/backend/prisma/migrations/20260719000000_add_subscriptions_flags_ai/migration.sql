-- CreateEnum
CREATE TYPE "AppSubscriptionPlan" AS ENUM ('PRO_MONTHLY', 'PRO_YEARLY', 'FAMILY_MONTHLY');

-- CreateEnum
CREATE TYPE "AppSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED', 'BILLING_RETRY', 'PAUSED', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'feature',
    "phase" TEXT NOT NULL DEFAULT 'mvp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revenuecatCustomerId" TEXT,
    "plan" "AppSubscriptionPlan" NOT NULL,
    "status" "AppSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "entitlement" TEXT NOT NULL DEFAULT 'pro',
    "originalPurchaseDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "renewalIntent" BOOLEAN NOT NULL DEFAULT true,
    "familyOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "app_subscriptions_userId_idx" ON "app_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "app_subscriptions_revenuecatCustomerId_idx" ON "app_subscriptions"("revenuecatCustomerId");

-- CreateIndex
CREATE INDEX "app_subscriptions_status_idx" ON "app_subscriptions"("status");

-- CreateIndex
CREATE INDEX "app_subscriptions_familyOwnerId_idx" ON "app_subscriptions"("familyOwnerId");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_updatedAt_idx" ON "ai_conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_userId_idx" ON "ai_usage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_userId_date_key" ON "ai_usage"("userId", "date");

-- AddForeignKey
ALTER TABLE "app_subscriptions" ADD CONSTRAINT "app_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

