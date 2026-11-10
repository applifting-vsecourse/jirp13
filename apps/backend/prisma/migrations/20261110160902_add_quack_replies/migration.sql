-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quack_parentId_createdAt_idx" ON "quack"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A live quack has text and an author; a placeholder (deleted quack that still
-- has replies) has neither, and no mood.
ALTER TABLE "quack" ADD CONSTRAINT "quack_deleted_has_no_content" CHECK (
  ("deletedAt" IS NULL AND "text" IS NOT NULL AND "userId" IS NOT NULL)
  OR
  ("deletedAt" IS NOT NULL AND "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL)
);

-- Replies are text only.
ALTER TABLE "quack" ADD CONSTRAINT "quack_reply_has_no_mood" CHECK (
  "parentId" IS NULL OR "mood" IS NULL
);

-- Only a top-level quack can be a placeholder; deleted replies are removed outright.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_is_top_level" CHECK (
  "deletedAt" IS NULL OR "parentId" IS NULL
);
