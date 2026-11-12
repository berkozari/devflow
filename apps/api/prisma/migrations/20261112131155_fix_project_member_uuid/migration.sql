/*
  Warnings:

  - You are about to drop the column `joinedAt` on the `ProjectMember` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ProjectMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN "joinedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
