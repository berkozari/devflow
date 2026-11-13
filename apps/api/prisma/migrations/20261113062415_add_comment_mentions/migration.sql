/*
  Warnings:

  - You are about to drop the `CommentMention` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CommentMention" DROP CONSTRAINT "CommentMention_commentId_fkey";

-- DropForeignKey
ALTER TABLE "CommentMention" DROP CONSTRAINT "CommentMention_userId_fkey";

-- DropIndex
DROP INDEX "Notification_userId_readAt_createdAt_idx";

-- DropTable
DROP TABLE "CommentMention";

-- CreateTable
CREATE TABLE "Mention" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mention_commentId_userId_key" ON "Mention"("commentId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
