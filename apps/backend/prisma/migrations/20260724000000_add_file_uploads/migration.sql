-- CreateTable
CREATE TABLE IF NOT EXISTS "file_uploads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "householdId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_uploads_userId_idx" ON "file_uploads"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_uploads_householdId_idx" ON "file_uploads"("householdId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_uploads_entityType_entityId_idx" ON "file_uploads"("entityType", "entityId");
