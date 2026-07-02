-- CreateEnum
CREATE TYPE "VendorVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "verificationJobId" TEXT,
ADD COLUMN     "verificationStatus" "VendorVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
