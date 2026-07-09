-- Update circle_invites default role to MEMBER
ALTER TABLE "circle_invites" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
