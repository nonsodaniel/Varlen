-- Make emoji optional on poll_options
ALTER TABLE "poll_options" ALTER COLUMN "emoji" DROP NOT NULL;
