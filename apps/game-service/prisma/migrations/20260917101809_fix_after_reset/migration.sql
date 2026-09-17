/*
  Warnings:

  - The values [REGISTRATION] on the enum `GameStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "game"."GameStatus_new" AS ENUM ('LOBBY', 'MODERATION', 'ACTIVE', 'FINISHED');
ALTER TABLE "game"."games" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "game"."games" ALTER COLUMN "status" TYPE "game"."GameStatus_new" USING ("status"::text::"game"."GameStatus_new");
ALTER TYPE "game"."GameStatus" RENAME TO "GameStatus_old";
ALTER TYPE "game"."GameStatus_new" RENAME TO "GameStatus";
DROP TYPE "game"."GameStatus_old";
ALTER TABLE "game"."games" ALTER COLUMN "status" SET DEFAULT 'LOBBY';
COMMIT;

-- AlterTable
ALTER TABLE "game"."game_snapshots" ALTER COLUMN "updatedAt" DROP DEFAULT;
