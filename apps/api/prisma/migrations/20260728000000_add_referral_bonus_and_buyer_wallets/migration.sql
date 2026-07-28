-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "buyerId" TEXT;

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "referralBonusAmount" DECIMAL(12,2) NOT NULL DEFAULT 500;

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_buyerId_key" ON "wallets"("buyerId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
