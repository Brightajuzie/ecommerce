-- AlterTable
ALTER TABLE "vendor_profiles" DROP COLUMN "verificationJobId",
DROP COLUMN "verificationStatus",
DROP COLUMN "verifiedAt",
ADD COLUMN     "businessRegistrationDocUrl" TEXT,
ADD COLUMN     "governmentIdDocUrl" TEXT;

-- DropEnum
DROP TYPE "VendorVerificationStatus";
