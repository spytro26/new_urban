/*
  Warnings:

  - You are about to drop the column `gst` on the `Orders` table. All the data in the column will be lost.
  - Added the required column `paymentMethod` to the `extraMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "gst";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isExtraMaterial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "extraMaterial" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" "paymentMethod" NOT NULL;
