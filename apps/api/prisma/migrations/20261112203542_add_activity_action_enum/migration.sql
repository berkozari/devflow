/*
  Warnings:

  - Changed the type of `action` on the `ActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_PRIORITY_CHANGED', 'TASK_ASSIGNED', 'TASK_DELETED', 'COMMENT_CREATED', 'COMMENT_UPDATED', 'COMMENT_DELETED');

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "action",
ADD COLUMN     "action" "ActivityAction" NOT NULL;
