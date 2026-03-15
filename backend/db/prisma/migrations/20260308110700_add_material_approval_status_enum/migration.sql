/*
  Warnings:

  - You are about to drop the column `approved` on the `extraMaterial` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "materialApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "extraMaterial" DROP COLUMN "approved",
ADD COLUMN     "approvalStatus" "materialApproval" NOT NULL DEFAULT 'PENDING';
