/*
  Warnings:

  - The values [ON_THEWAYj] on the enum `status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `address` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `pin` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pin` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "status_new" AS ENUM ('PENDING', 'ON_THEWAY', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."OrderGroup" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OrderGroup" ALTER COLUMN "status" TYPE "status_new" USING ("status"::text::"status_new");
ALTER TYPE "status" RENAME TO "status_old";
ALTER TYPE "status_new" RENAME TO "status";
DROP TYPE "public"."status_old";
ALTER TABLE "OrderGroup" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "address",
DROP COLUMN "pin";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "pin";

-- CreateTable
CREATE TABLE "address" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "city" TEXT,
    "isUser" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    "agentId" INTEGER,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
