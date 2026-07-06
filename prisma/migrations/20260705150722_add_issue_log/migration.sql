-- CreateTable
CREATE TABLE "IssueLog" (
    "id" SERIAL NOT NULL,
    "issueId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IssueLog" ADD CONSTRAINT "IssueLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLog" ADD CONSTRAINT "IssueLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
