-- AlterTable
ALTER TABLE "platform_payment_settings" ADD COLUMN     "flutterwaveEncryptionKey" TEXT,
ADD COLUMN     "flutterwavePublicKey" TEXT,
ADD COLUMN     "flutterwaveSecretKey" TEXT,
ADD COLUMN     "opayMerchantId" TEXT,
ADD COLUMN     "opayPublicKey" TEXT,
ADD COLUMN     "opaySecretKey" TEXT,
ADD COLUMN     "supportEmail" TEXT;
