-- DropIndex
DROP INDEX "ActivityLog_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "Comment_taskId_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_readAt_createdAt_idx";

-- DropIndex
DROP INDEX "ProjectMember_projectId_idx";

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- CreateIndex
CREATE INDEX "ActivityLog_projectId_createdAt_id_idx" ON "ActivityLog"("projectId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_projectId_taskId_createdAt_id_idx" ON "ActivityLog"("projectId", "taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Comment_taskId_createdAt_id_idx" ON "Comment"("taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_id_idx" ON "Notification"("userId", "readAt", "createdAt", "id");
