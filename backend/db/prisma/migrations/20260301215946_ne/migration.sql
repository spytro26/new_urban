/*
  Warnings:

  - You are about to drop the column `agentId` on the `OrderGroup` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "status" ADD VALUE 'ON_THEWAYj';

-- DropForeignKey
ALTER TABLE "OrderGroup" DROP CONSTRAINT "OrderGroup_agentId_fkey";

-- DropIndex
DROP INDEX "OrderGroup_agentId_idx";

-- AlterTable
ALTER TABLE "OrderGroup" DROP COLUMN "agentId",
ADD COLUMN     "assignedAgentId" INTEGER;

-- CreateIndex
CREATE INDEX "OrderGroup_assignedAgentId_idx" ON "OrderGroup"("assignedAgentId");

-- AddForeignKey
ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
