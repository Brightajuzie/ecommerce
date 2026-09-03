-- AlterTable
ALTER TABLE "vendor_messages" ADD COLUMN     "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "senderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "suspensionWarnedAt" TIMESTAMP(3);
