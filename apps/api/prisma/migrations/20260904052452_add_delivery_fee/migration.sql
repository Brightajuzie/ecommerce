-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
