-- Which compliance checks passed or were missing when the branch returned a registration or application.
ALTER TABLE "Property" ADD COLUMN "reviewFeedback" TEXT;
ALTER TABLE "Application" ADD COLUMN "reviewFeedback" TEXT;
