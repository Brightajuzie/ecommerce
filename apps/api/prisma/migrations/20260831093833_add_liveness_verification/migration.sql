-- AlterTable
ALTER TABLE "users" ADD COLUMN     "livenessVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livenessVerifiedAt" TIMESTAMP(3);
