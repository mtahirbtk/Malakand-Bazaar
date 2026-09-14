-- 0018 — the Storage bucket itself.
--
-- §1.3: Supabase Storage, public-read, one bucket for listing photos, seller
-- avatars and banners (SUPABASE_STORAGE_BUCKET, default "media" — see
-- src/server/storage.ts and .env.example). A bucket is a row in
-- storage.buckets, so it is provisioned the same way as every other piece of
-- schema: a migration, not a manual dashboard click that a fresh environment
-- would silently be missing.
--
-- public = true because publicStorageUrl() builds a plain
-- `/storage/v1/object/public/...` URL with no signing — reads never touch our
-- API. Writes are a different story: nothing can PUT to this bucket without a
-- signed upload URL our server issued (POST /api/uploads/sign), which is the
-- real access control here, not a bucket policy — RLS on storage.objects is
-- deny-all like every other table (0008), same trusted-backend posture.
--
-- file_size_limit and allowed_mime_types are enforced again, independently,
-- by src/server/services/uploads.ts (sharp decodes the real bytes at commit
-- time) — belt and braces, not either-or.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MiB, matches MAX_UPLOAD_BYTES in src/server/schemas/uploads.ts
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
