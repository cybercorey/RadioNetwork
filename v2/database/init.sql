-- CreateTable
CREATE TABLE "stations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "stream_url" TEXT NOT NULL,
    "homepage_url" TEXT,
    "logo_url" TEXT,
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'NZ',
    "tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scrape_interval" INTEGER NOT NULL DEFAULT 60,
    "last_scraped_at" TIMESTAMP(3),
    "metadata_type" VARCHAR(50) NOT NULL DEFAULT 'icy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "artist" VARCHAR(500) NOT NULL,
    "title_normalized" VARCHAR(500) NOT NULL,
    "artist_normalized" VARCHAR(500) NOT NULL,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plays" (
    "id" BIGSERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "song_id" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,
    "raw_metadata" JSONB,
    "confidence_score" REAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "songs_found" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_slug_key" ON "stations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "songs_title_normalized_artist_normalized_key" ON "songs"("title_normalized", "artist_normalized");

-- CreateIndex
CREATE INDEX "songs_artist_normalized_title_normalized_idx" ON "songs"("artist_normalized", "title_normalized");

-- CreateIndex
CREATE INDEX "plays_station_id_played_at_idx" ON "plays"("station_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "plays_song_id_played_at_idx" ON "plays"("song_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "plays_played_at_idx" ON "plays"("played_at" DESC);

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert seed data for NZ radio stations
INSERT INTO "stations" ("name", "slug", "stream_url", "homepage_url", "country_code", "tags", "scrape_interval") VALUES
('The Rock', 'the-rock', 'https://digitalstreams.mediaworks.nz/rock_net_icy', 'https://www.therock.net.nz/', 'NZ', ARRAY['rock', 'alternative', 'classic rock'], 60),
('The Edge', 'the-edge', 'https://digitalstreams.mediaworks.nz/edge_net_icy', 'https://www.theedge.co.nz/', 'NZ', ARRAY['pop', 'hits', 'top 40'], 60),
('The Sound', 'the-sound', 'https://digitalstreams.mediaworks.nz/sound_net_icy', 'https://www.thesound.co.nz/', 'NZ', ARRAY['classic hits', 'variety'], 60),
('The Breeze', 'the-breeze', 'https://digitalstreams.mediaworks.nz/breeze_net_icy', 'https://www.thebreeze.co.nz/', 'NZ', ARRAY['easy listening', 'soft rock'], 60);
