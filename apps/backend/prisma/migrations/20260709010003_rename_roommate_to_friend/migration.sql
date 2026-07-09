-- Rename ROOMMATE to FRIEND in HouseholdRole enum
-- Add FRIEND first, update existing rows, then remove ROOMMATE
ALTER TYPE "HouseholdRole" ADD VALUE IF NOT EXISTS 'FRIEND';
