-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- Partial unique indexes (PostgreSQL: NULL != NULL, standard UNIQUE constraint tidak cukup)
CREATE UNIQUE INDEX "Folder_activityId_name_root_key"
  ON "Folder"("activityId", "name") WHERE "parentId" IS NULL;

CREATE UNIQUE INDEX "Folder_activityId_parentId_name_key"
  ON "Folder"("activityId", "parentId", "name") WHERE "parentId" IS NOT NULL;

-- AlterTable: kolom folderId di Media (nullable, existing rows → NULL = activity root)
ALTER TABLE "Media" ADD COLUMN "folderId" TEXT;

-- FK: Folder → Activity (cascade saat activity dihapus)
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: Folder → Folder self-reference (cascade hapus child saat parent dihapus di DB)
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: Media → Folder (SET NULL saat folder dihapus di DB)
ALTER TABLE "Media" ADD CONSTRAINT "Media_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
