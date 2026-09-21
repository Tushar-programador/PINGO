CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "live_profiles" ADD CONSTRAINT "live_profiles_one_active_per_user"
  EXCLUDE USING gist (user_id WITH =, tstzrange(started_at, expires_at) WITH &&)
  WHERE (status = 'ACTIVE');
