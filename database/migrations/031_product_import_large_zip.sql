-- Allow large product-import archives in the existing private staging bucket.
-- Permanent product images remain in WordPress Media.
update storage.buckets
set public = false,
    file_size_limit = 786432000 -- 750 MiB
where id = 'ofissio-product-imports';
