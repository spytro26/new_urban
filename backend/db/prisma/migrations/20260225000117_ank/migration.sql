/*
  Warnings:

  - You are about to drop the column `agentId` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `ordersId` on the `extraMaterial` table. All the data in the column will be lost.
  - Added the required column `subserviceId` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_agentId_fkey";

-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "extraMaterial" DROP CONSTRAINT "extraMaterial_ordersId_fkey";

-- DropIndex
DROP INDEX "Orders_agentId_idx";

-- DropIndex
DROP INDEX "Orders_userId_idx";

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "agentId",
DROP COLUMN "userId",
ADD COLUMN     "groupId" INTEGER,
ADD COLUMN     "subserviceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "extraMaterial" DROP COLUMN "ordersId";

-- CreateTable
CREATE TABLE "OrderGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT,
    "totalPrice" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" INTEGER,

    CONSTRAINT "OrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderGroup_userId_idx" ON "OrderGroup"("userId");

-- CreateIndex
CREATE INDEX "OrderGroup_agentId_idx" ON "OrderGroup"("agentId");

-- CreateIndex
CREATE INDEX "Orders_groupId_idx" ON "Orders"("groupId");

-- CreateIndex
CREATE INDEX "Orders_subserviceId_idx" ON "Orders"("subserviceId");

-- AddForeignKey
ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_subserviceId_fkey" FOREIGN KEY ("subserviceId") REFERENCES "subservice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrderGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
