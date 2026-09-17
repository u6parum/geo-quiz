-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "game";

-- CreateEnum
CREATE TYPE "game"."ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "game"."GameStatus" AS ENUM ('LOBBY', 'REGISTRATION', 'MODERATION', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "game"."LandmarkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "game"."teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."team_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "landmarkName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hints" JSONB NOT NULL,
    "status" "game"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."games" (
    "id" TEXT NOT NULL,
    "status" "game"."GameStatus" NOT NULL DEFAULT 'LOBBY',
    "durationSeconds" INTEGER NOT NULL,
    "hintsSchedule" INTEGER[],
    "questionWindows" INTEGER[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."game_teams" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."landmarks" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hints" JSONB NOT NULL,
    "status" "game"."LandmarkStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "landmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."questions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "askedAt" INTEGER NOT NULL,
    "answered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "answeredAt" INTEGER NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."guesses" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "targetTeamId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "earnedScore" INTEGER NOT NULL DEFAULT 0,
    "elapsedAt" INTEGER NOT NULL,

    CONSTRAINT "guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game"."game_snapshots" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "game"."teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "game"."team_members"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_applications_userId_key" ON "game"."team_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_teams_gameId_teamId_key" ON "game"."game_teams"("gameId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "landmarks_gameId_teamId_key" ON "game"."landmarks"("gameId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_questionId_key" ON "game"."answers"("questionId");

-- CreateIndex
CREATE INDEX "game_snapshots_gameId_timestamp_idx" ON "game"."game_snapshots"("gameId", "timestamp");

-- AddForeignKey
ALTER TABLE "game"."team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "game"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."team_applications" ADD CONSTRAINT "team_applications_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "game"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."game_teams" ADD CONSTRAINT "game_teams_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."game_teams" ADD CONSTRAINT "game_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "game"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."landmarks" ADD CONSTRAINT "landmarks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."landmarks" ADD CONSTRAINT "landmarks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "game"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."questions" ADD CONSTRAINT "questions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "game"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."guesses" ADD CONSTRAINT "guesses_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game"."game_snapshots" ADD CONSTRAINT "game_snapshots_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"."games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
