-- media_assets is the public listing gallery, so its bucket column must not be
-- able to name a private one.
--
-- The column was free text defaulting to 'listing-media', and
-- /api/files/thumb/[id] signs whatever it contains without authentication. The
-- handler now refuses anything but the public bucket; this makes the same rule
-- true at the storage layer, so a future writer cannot park a private document
-- here and quietly make it world-readable.

alter table public.media_assets
  drop constraint if exists media_assets_bucket_check;

alter table public.media_assets
  add constraint media_assets_bucket_check
  check (bucket = 'listing-media');
