-- Add missing HouseholdRole enum values
ALTER TYPE "HouseholdRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "HouseholdRole" ADD VALUE IF NOT EXISTS 'MEMBER';
ALTER TYPE "HouseholdRole" ADD VALUE IF NOT EXISTS 'VIEWER';
