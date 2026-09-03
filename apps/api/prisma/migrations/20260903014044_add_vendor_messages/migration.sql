-- CreateTable
CREATE TABLE "vendor_messages" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "readByVendorAt" TIMESTAMP(3),
    "readByAdminAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_messages_vendorId_createdAt_idx" ON "vendor_messages"("vendorId", "createdAt");

-- AddForeignKey
ALTER TABLE "vendor_messages" ADD CONSTRAINT "vendor_messages_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_messages" ADD CONSTRAINT "vendor_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
