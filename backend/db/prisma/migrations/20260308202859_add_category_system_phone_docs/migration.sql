-- CreateEnum
CREATE TYPE "documentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "MonthlySettlement" ADD COLUMN     "extraEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "serviceEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- Seed default categories from old enum
INSERT INTO "Category" ("name", "slug") VALUES ('Plumber', 'plumber');
INSERT INTO "Category" ("name", "slug") VALUES ('Electrician', 'electrician');

-- Add categoryId to subservice before dropping old column
ALTER TABLE "subservice" ADD COLUMN "categoryId" INTEGER;

-- Migrate existing data: map old category enum to new Category table
UPDATE "subservice" SET "categoryId" = (SELECT "id" FROM "Category" WHERE "slug" = 'plumber') WHERE "category" = 'PLUMBER';
UPDATE "subservice" SET "categoryId" = (SELECT "id" FROM "Category" WHERE "slug" = 'electrician') WHERE "category" = 'ELECTRICIAN';

-- Now drop the old column
ALTER TABLE "subservice" DROP COLUMN "category";

-- DropEnum
DROP TYPE "serviceCategory";

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCategory" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDocument" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "requirementId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status" "documentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCategory_agentId_idx" ON "AgentCategory"("agentId");

-- CreateIndex
CREATE INDEX "AgentCategory_categoryId_idx" ON "AgentCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCategory_agentId_categoryId_key" ON "AgentCategory"("agentId", "categoryId");

-- CreateIndex
CREATE INDEX "AgentDocument_agentId_idx" ON "AgentDocument"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDocument_agentId_requirementId_key" ON "AgentDocument"("agentId", "requirementId");

-- Seed default doc requirements for existing categories
INSERT INTO "DocumentRequirement" ("name", "description", "isRequired", "categoryId")
SELECT 'ID Proof', 'Government-issued photo ID', true, "id" FROM "Category" WHERE "slug" = 'plumber';
INSERT INTO "DocumentRequirement" ("name", "description", "isRequired", "categoryId")
SELECT 'Address Proof', 'Address verification document', true, "id" FROM "Category" WHERE "slug" = 'plumber';
INSERT INTO "DocumentRequirement" ("name", "description", "isRequired", "categoryId")
SELECT 'ID Proof', 'Government-issued photo ID', true, "id" FROM "Category" WHERE "slug" = 'electrician';
INSERT INTO "DocumentRequirement" ("name", "description", "isRequired", "categoryId")
SELECT 'Address Proof', 'Address verification document', true, "id" FROM "Category" WHERE "slug" = 'electrician';

-- Migrate existing agents: create AgentCategory entries from their `type` field
INSERT INTO "AgentCategory" ("agentId", "categoryId", "isVerified")
SELECT a."id", c."id", a."isVerified"
FROM "Agent" a
JOIN "Category" c ON LOWER(a."type") = c."slug"
WHERE a."type" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCategory" ADD CONSTRAINT "AgentCategory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCategory" ADD CONSTRAINT "AgentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDocument" ADD CONSTRAINT "AgentDocument_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDocument" ADD CONSTRAINT "AgentDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "DocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subservice" ADD CONSTRAINT "subservice_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
