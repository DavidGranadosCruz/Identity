-- AlterTable
ALTER TABLE "public"."IdentityPackImage"
ADD COLUMN "identityClusterId" TEXT,
ADD COLUMN "identityConsistencyScore" INTEGER,
ADD COLUMN "isIdentityValid" BOOLEAN,
ADD COLUMN "identityDecisionReason" TEXT;

-- AlterTable
ALTER TABLE "public"."GenerationVariant"
ADD COLUMN "identitySimilarityScore" INTEGER,
ADD COLUMN "referenceCompositionScore" INTEGER,
ADD COLUMN "backgroundPreservationScore" INTEGER,
ADD COLUMN "poseMatchScore" INTEGER,
ADD COLUMN "overallAcceptanceScore" INTEGER,
ADD COLUMN "accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "public"."IdentityProfile" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "status" "public"."AnalysisStatus" NOT NULL DEFAULT 'pending',
    "minRequiredImages" INTEGER NOT NULL DEFAULT 4,
    "validImageCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedImageCount" INTEGER NOT NULL DEFAULT 0,
    "consistencyScore" INTEGER,
    "primaryClusterId" TEXT,
    "centroidVectorJson" JSONB,
    "profileJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdentityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityProfile_packId_key" ON "public"."IdentityProfile"("packId");

-- CreateIndex
CREATE INDEX "IdentityProfile_status_updatedAt_idx" ON "public"."IdentityProfile"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "public"."IdentityProfile"
ADD CONSTRAINT "IdentityProfile_packId_fkey"
FOREIGN KEY ("packId") REFERENCES "public"."IdentityPack"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
