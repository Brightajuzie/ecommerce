-- CreateEnum
CREATE TYPE "IdentityVerificationType" AS ENUM ('NIN', 'BVN');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('VERIFIED', 'FAILED', 'ERROR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "identityVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idType" "IdentityVerificationType" NOT NULL,
    "idNumberLast4" TEXT NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL,
    "resultCode" TEXT,
    "resultText" TEXT,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_verifications_userId_idx" ON "identity_verifications"("userId");

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
