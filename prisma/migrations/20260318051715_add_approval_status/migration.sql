-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Intake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL DEFAULT '',
    "timeline" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "approvalStatus" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiStatus" TEXT NOT NULL DEFAULT 'pending',
    "aiSummary" TEXT,
    "aiTags" TEXT,
    "aiRiskChecklist" TEXT,
    "aiValueProposition" TEXT,
    "aiError" TEXT
);
INSERT INTO "new_Intake" ("aiError", "aiRiskChecklist", "aiStatus", "aiSummary", "aiTags", "aiValueProposition", "budgetRange", "createdAt", "description", "id", "industry", "timeline", "title") SELECT "aiError", "aiRiskChecklist", "aiStatus", "aiSummary", "aiTags", "aiValueProposition", "budgetRange", "createdAt", "description", "id", "industry", "timeline", "title" FROM "Intake";
DROP TABLE "Intake";
ALTER TABLE "new_Intake" RENAME TO "Intake";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
