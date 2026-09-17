/*
  Warnings:

  - A unique constraint covering the columns `[teamId]` on the table `landmarks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "game"."landmarks" DROP CONSTRAINT "landmarks_gameId_fkey";

-- DropIndex
DROP INDEX "game"."landmarks_gameId_teamId_key";

-- AlterTable
ALTER TABLE "game"."landmarks" ALTER COLUMN "gameId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "landmarks_teamId_key" ON "game"."landmarks"("teamId");

-- AddForeignKey
ALTER TABLE "game"."landmarks" ADD CONSTRAINT "landmarks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
