/*
  Warnings:

  - You are about to drop the column `gameId` on the `landmarks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "game"."landmarks" DROP CONSTRAINT "landmarks_gameId_fkey";

-- AlterTable
ALTER TABLE "game"."landmarks" DROP COLUMN "gameId";
