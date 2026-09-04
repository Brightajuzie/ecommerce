-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'COD';

-- AlterTable
ALTER TABLE "platform_payment_settings" ADD COLUMN     "codEnabled" BOOLEAN NOT NULL DEFAULT false;
