import assert from "node:assert/strict";
import { normalizePath } from "../src/features/product-import/product-import.normalization";
import { parsePhotoManifest } from "../src/features/product-import/photo-manifest.parser";
import { createProductImportPreview } from "../src/features/product-import/product-import.service";
import { parseWooCommerceCsv } from "../src/features/product-import/woocommerce-csv.parser";

const woo = `ID,Type,SKU,Name,Published,Short description,Description,Regular price,Sale price,Categories,Tags,Parent,Images,Attribute 1 name,Attribute 1 value(s),Attribute 1 visible,Attribute 1 global,Attribute 2 name,Attribute 2 value(s),Attribute 2 visible,Attribute 2 global
1,variable,KK-001,Kemeja KK-001,1,,,150000,,Kemeja,,,https://old/kk1.jpg,Warna,Navy,1,1,Ukuran,"S, M",1,1
2,variation,KK-001-S,Kemeja KK-001 S,1,,,,,,,id:1,,Warna,Navy,1,1,Ukuran,S,1,1
3,variable,KK-007,Kemeja KK-007,1,,,150000,,Kemeja,,,,Warna,"Biru Navy, Merah",1,1,,,
4,variation,KK-007-MERAH,Kemeja KK-007 Merah,1,,,,,,,id:3,,Warna,Merah,1,1,,,
5,variable,KK-011-1,Kemeja Kerja KK-017,1,,,160000,,Kemeja,,,,Ukuran,"S, M",1,1,,,
6,variation,KK-017-S,Kemeja Kerja KK-017 S,1,,,,,,,id:5,,Ukuran,S,1,1,,,
7,variable,KS-001,Kemeja KS-001,1,,,140000,,Kemeja,,,,Ukuran,"S, M",1,1,,,
8,variation,,Kemeja KS-001 S,1,,,,,,,id:7,,Ukuran,S,1,1,,,
9,simple,NO-PHOTO,Produk tanpa foto,1,,,100000,,Kemeja,,,,,,,,
10,external,EXT-001,Produk external,1,,,100000,,Lainnya,,,,,,,,`;
const manifest = `RelativePath,Name,Extension,Length
KK\\KK-001\\01.jpg,01.jpg,.jpg,10
KK/KK-001/KK-001-2.JPG,KK-001-2.JPG,.JPG,10
KK/KK-007 BIRU/01.png,01.png,.png,10
KK/KK-007 MERAH/01.webp,01.webp,.webp,10
KK/KK-017/KK-017.jpg,KK-017.jpg,.jpg,10
KL/KL-003/01.jpeg,01.jpeg,.jpeg,10
KL/KL-003/model.glb,model.glb,.glb,10
KL/KL-003/demo.mp4,demo.mp4,.mp4,10
KL/orphan-a.jpg,orphan-a.jpg,.jpg,10
KL/orphan-b.PNG,orphan-b.PNG,.PNG,10
ARCHIVE/KK-001/02.jpg,02.jpg,.jpg,10`;

const parsed = parseWooCommerceCsv(woo);
assert.equal(parsed.rows.length, 10, "Woo CSV parser");
assert.equal(parsed.bySku.get("KK-001")?.attributes.length, 2, "dynamic attributes parser");
assert.equal(parsed.variationsByParentId.get("1")?.length, 1, "variable/variation relation");
assert.match(parsed.rows.find((row) => row.sourceId === "8")?.internalKey ?? "", /^KS-001::/, "variation without SKU");
assert.equal(normalizePath("KK\\KK-001\\01.jpg"), "KK/KK-001/01.jpg", "Windows path normalization");
assert.equal(normalizePath("KK/KK-001/01.jpg"), "KK/KK-001/01.jpg", "Unix path normalization");
const assets = parsePhotoManifest(manifest); assert.equal(assets[0]?.directory, "KK/KK-001", "recursive folder parsing");
const preview = createProductImportPreview(woo, manifest);
const find = (sku: string) => preview.products.find((item) => item.normalizedSku === sku || item.suggestedSku === sku);
assert.equal(find("KK-001")?.images.length, 3, "exact SKU matching + duplicate folders retained");
assert.equal(find("KK-001")?.status, "DUPLICATE_IMAGE_FOLDER", "duplicate directory");
assert.equal(find("KK-007")?.variantPhotos.length, 2, "variant image folder detection");
assert.equal(find("KK-007")?.variantPhotos.find((item) => item.hint === "BIRU")?.exact, false, "controlled variant hint warning");
assert.equal(find("KL-003")?.status, "PRODUCT_MISSING", "product missing");
assert.equal(find("NO-PHOTO")?.status, "PHOTO_MISSING", "photo missing");
assert.equal(find("KK-017")?.suggestedSku, "KK-017", "parent SKU anomaly suggestion");
assert.equal(find("KL-003")?.glbAssets.length, 1, "GLB detection");
assert.equal(find("KL-003")?.videoAssets.length, 1, "video detection");
assert.match(find("KK-001")?.suggestedCover ?? "", /01\.jpg$/, "image sorting");
assert.equal(preview.summary.photoFolders, 6, "physical SKU photo folders");
assert.equal(preview.summary.basePhotoSkus, 4, "unique base photo SKUs");
assert.equal(preview.summary.totalImageFiles, 9, "total images includes unassigned files");
assert.equal(preview.summary.assignedImages, 7, "assigned images");
assert.equal(preview.summary.unassignedImages, 2, "unassigned images");
assert.equal(preview.summary.localPhotoMatchedProducts, 3, "local photo matched parent products counted once");
assert.equal(preview.summary.photoOnlyProducts, 1, "photo-only products");
assert.equal(preview.warningBreakdown.find((item) => item.category === "Unassigned image")?.count, 2, "unassigned warning breakdown");
console.log("PASS: 25 product import parser/matcher/metrics checks");
