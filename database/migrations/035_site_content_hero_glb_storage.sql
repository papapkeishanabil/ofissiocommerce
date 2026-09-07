-- Persistent private storage for admin-uploaded Hero GLB models.
--
-- The application stores objects under site-content/hero/ in the existing
-- 3D bucket and exposes them through a same-origin resolver that creates
-- short-lived signed URLs. Apply manually in the Supabase SQL Editor.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ofissio-3d-models',
  'ofissio-3d-models',
  false,
  52428800,
  array['model/gltf-binary', 'application/octet-stream']
)
on conflict (id) do nothing;

-- No browser-facing Storage policy is intentionally created. Uploads and
-- signed reads are performed server-side with the service role after RBAC,
-- rate-limit, extension, MIME, size, and GLB signature validation.
