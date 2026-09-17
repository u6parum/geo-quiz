/*
  Warnings:

  - You are about to drop the column `teamId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "auth"."users" DROP COLUMN "teamId";
