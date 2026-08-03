-- AlterTable: Add customMetrics JSON field to wellness_entries
ALTER TABLE "wellness_entries" ADD COLUMN "customMetrics" JSONB;
