-- CreateEnum
CREATE TYPE "AreaStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'RELEASED', 'FORBIDDEN');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "wallets" (
    "address" TEXT NOT NULL,
    "totalQuota" BIGINT NOT NULL DEFAULT 0,
    "lockedPixels" BIGINT NOT NULL DEFAULT 0,
    "availableQuota" BIGINT NOT NULL DEFAULT 0,
    "gracePeriodEnd" TIMESTAMP(3),
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "skipSignature" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "pixel_areas" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "pixelCount" BIGINT NOT NULL,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "imageType" TEXT,
    "link" TEXT,
    "status" "AreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pixel_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_tiles" (
    "id" TEXT NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "imageData" TEXT,
    "isDirty" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_tiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_events" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pixel_areas_walletAddress_idx" ON "pixel_areas"("walletAddress");

-- CreateIndex
CREATE INDEX "pixel_areas_status_idx" ON "pixel_areas"("status");

-- CreateIndex
CREATE INDEX "pixel_areas_x_y_idx" ON "pixel_areas"("x", "y");

-- CreateIndex
CREATE INDEX "canvas_tiles_tileX_tileY_idx" ON "canvas_tiles"("tileX", "tileY");

-- CreateIndex
CREATE UNIQUE INDEX "token_events_signature_key" ON "token_events"("signature");

-- CreateIndex
CREATE INDEX "token_events_walletAddress_idx" ON "token_events"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "pixel_areas" ADD CONSTRAINT "pixel_areas_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_events" ADD CONSTRAINT "token_events_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
