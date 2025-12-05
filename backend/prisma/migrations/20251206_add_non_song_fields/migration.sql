-- AlterTable
ALTER TABLE "songs" ADD COLUMN "is_non_song" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN "non_song_type" VARCHAR(50);
