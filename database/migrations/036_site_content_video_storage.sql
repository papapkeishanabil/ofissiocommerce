-- Persistent private storage for admin-uploaded Hero and Section 04 videos.
-- Apply manually in the Supabase SQL Editor before using the uploader.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ofissio-site-videos',
  'ofissio-site-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No public Storage policy is created. Uploads and signed reads are handled
-- server-side with the service role after RBAC, rate-limit, MIME, size,
-- extension, and file-signature validation.
