-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('OCR', 'API', 'DB', 'AUTH', 'SYSTEM');

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "severity" "ErrorSeverity" NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "details" JSONB,
    "stackTrace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);
