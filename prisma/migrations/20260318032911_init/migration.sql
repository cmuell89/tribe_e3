-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL DEFAULT '',
    "timeline" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiStatus" TEXT NOT NULL DEFAULT 'pending',
    "aiSummary" TEXT,
    "aiTags" TEXT,
    "aiRiskChecklist" TEXT,
    "aiValueProposition" TEXT,
    "aiError" TEXT
);
