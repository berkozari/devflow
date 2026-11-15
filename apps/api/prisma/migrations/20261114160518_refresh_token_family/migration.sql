/*
  Warnings:

  - A unique constraint covering the columns `[replacedByTokenId]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `familyId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "familyId" UUID,
ADD COLUMN     "replacedByTokenId" UUID,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "usedAt" TIMESTAMP(3);

UPDATE "RefreshToken"
SET "familyId" = "id"
WHERE "familyId" IS NULL;

ALTER TABLE "RefreshToken"
ALTER COLUMN "familyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedByTokenId_key" ON "RefreshToken"("replacedByTokenId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_familyId_idx" ON "RefreshToken"("userId", "familyId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
