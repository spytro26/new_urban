/*
  Warnings:

  - You are about to drop the column `mode` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `servicetime` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Orders` table. All the data in the column will be lost.
  - Added the required column `servicetime` to the `OrderGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addedByAgentId` to the `extraMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `extraMaterial` table without a default value. This is not possible if the table is not empty.
  - Made the column `price` on table `extraMaterial` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "paymentMethod" AS ENUM ('CASH', 'ONLINE');

-- CreateEnum
CREATE TYPE "paymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED');

-- DropIndex
DROP INDEX "Orders_status_idx";

-- AlterTable
ALTER TABLE "OrderGroup" ADD COLUMN     "paymentStatus" "paymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "servicetime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "mode",
DROP COLUMN "servicetime",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "extraMaterial" ADD COLUMN     "addedByAgentId" INTEGER NOT NULL,
ADD COLUMN     "groupId" INTEGER NOT NULL,
ALTER COLUMN "price" SET NOT NULL;

-- DropEnum
DROP TYPE "payment";

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "paymentMethod" NOT NULL,
    "transactionId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_groupId_idx" ON "Payment"("groupId");

-- CreateIndex
CREATE INDEX "extraMaterial_groupId_idx" ON "extraMaterial"("groupId");

-- AddForeignKey
ALTER TABLE "extraMaterial" ADD CONSTRAINT "extraMaterial_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrderGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraMaterial" ADD CONSTRAINT "extraMaterial_addedByAgentId_fkey" FOREIGN KEY ("addedByAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrderGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
