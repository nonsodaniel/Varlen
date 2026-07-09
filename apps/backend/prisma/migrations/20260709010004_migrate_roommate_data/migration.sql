-- Update any existing ROOMMATE rows to FRIEND
UPDATE "household_members" SET "role" = 'FRIEND' WHERE "role" = 'ROOMMATE';
UPDATE "circle_invites" SET "role" = 'FRIEND' WHERE "role" = 'ROOMMATE';
