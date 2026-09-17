/*
  Warnings:

  - You are about to drop the column `timestamp` on the `game_snapshots` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gameId]` on the table `game_snapshots` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "game"."game_snapshots" DROP CONSTRAINT "game_snapshots_gameId_fkey";

-- DropIndex
DROP INDEX "game"."game_snapshots_gameId_timestamp_idx";

-- AlterTable
ALTER TABLE "game"."game_snapshots" DROP COLUMN "timestamp",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "game_snapshots_gameId_key" ON "game"."game_snapshots"("gameId");

-- AddForeignKey
ALTER TABLE "game"."game_snapshots" ADD CONSTRAINT "game_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
