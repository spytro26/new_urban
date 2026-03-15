-- CreateEnum
CREATE TYPE "serviceCategory" AS ENUM ('PLUMBER', 'ELECTRICIAN');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderGroup" ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "subservice" ADD COLUMN     "category" "serviceCategory" NOT NULL DEFAULT 'PLUMBER';
