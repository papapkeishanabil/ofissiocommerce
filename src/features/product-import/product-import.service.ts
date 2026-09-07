import { naturalCompare, normalizeAttributeValue, normalizeSku, normalizeVariantHint } from "./product-import.normalization";
import { parsePhotoManifest } from "./photo-manifest.parser";
import { parseWooCommerceCsv } from "./woocommerce-csv.parser";
import type { ImportIssue, PhotoFolder, PhotoManifestAsset, ProductImportPreview, ProductImportPreviewItem, WooCommerceImportProduct, WooImportIndex } from "./product-import.types";

function detectFolder(directory: string, knownSkus: string[]): { baseSku: string; variantHint: string | null } | null {
  for (const segment of directory.split("/").reverse()) {
    const normalized = normalizeSku(segment); const sku = knownSkus.find((candidate) => normalized === candidate || normalized.startsWith(`${candidate} `));
    if (sku) return { baseSku: sku, variantHint: normalized === sku ? null : segment.trim().slice(sku.length).trim() || null };
  }
  const segment = directory.split("/").at(-1)?.trim() ?? "";
  return /^[A-Z]{1,6}-[A-Z0-9][A-Z0-9.-]*(?:\s+.+)?$/i.test(segment) ? { baseSku: normalizeSku(segment.split(/\s+/)[0]), variantHint: segment.split(/\s+/).slice(1).join(" ") || null } : null;
}
function foldersFromAssets(assets: PhotoManifestAsset[], index: WooImportIndex): PhotoFolder[] {
  const known = [...index.bySku.keys()].sort((a, b) => b.length - a.length); const grouped = new Map<string, PhotoManifestAsset[]>();
  for (const asset of assets) grouped.set(asset.directory, [...(grouped.get(asset.directory) ?? []), asset]);
  return [...grouped].flatMap(([path, values]) => { const match = detectFolder(path, known); return match ? [{ path, folderName: path.split("/").at(-1) ?? path, ...match, assets: values }] : []; });
}
function coverScore(asset: PhotoManifestAsset, sku: string) { const stem = asset.name.replace(/\.[^.]+$/, ""); if (/^01(?:[-_]|$)/i.test(stem)) return 1; if (new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[-_ ]1$`, "i").test(stem)) return 2; if (normalizeSku(stem) === normalizeSku(sku)) return 3; return 4; }
function sortImages(images: PhotoManifestAsset[], sku: string) { return [...images].sort((a, b) => coverScore(a, sku) - coverScore(b, sku) || naturalCompare(a.name, b.name)); }
function parentVariations(index: WooImportIndex, product: WooCommerceImportProduct) { return index.variationsByParentId.get(product.sourceId) ?? []; }
function variantValues(product: WooCommerceImportProduct, variations: WooCommerceImportProduct[]) { return [...product.attributes, ...variations.flatMap((item) => item.attributes)].flatMap((attribute) => attribute.values); }
function anomalyFor(folder: PhotoFolder, index: WooImportIndex) {
  return index.parents.find((parent) => normalizeAttributeValue(parent.name).includes(folder.baseSku) && parentVariations(index, parent).filter((variation) => variation.sku).some((variation) => normalizeSku(variation.sku).startsWith(`${folder.baseSku}-`)));
}
function makeItem(product: WooCommerceImportProduct | null, folders: PhotoFolder[], index: WooImportIndex, suggestedSku: string | null = null): ProductImportPreviewItem {
  const sku = suggestedSku ?? (normalizeSku(product?.sku) || folders[0]?.baseSku || "UNKNOWN"); const variations = product ? parentVariations(index, product) : [];
  const images = sortImages(folders.flatMap((folder) => folder.assets.filter((asset) => asset.type === "IMAGE")), sku); const issues: ImportIssue[] = [];
  const basePaths = folders.filter((folder) => !folder.variantHint).map((folder) => folder.path); const duplicateVariant = new Set(folders.filter((folder) => folder.variantHint).map((folder) => normalizeVariantHint(folder.variantHint!))).size < folders.filter((folder) => folder.variantHint).length;
  if (basePaths.length > 1 || duplicateVariant) issues.push({ severity: "ERROR", code: "DUPLICATE_IMAGE_FOLDER", message: `Lebih dari satu folder foto mengklaim SKU/variant ${sku}.` });
  if (!product) issues.push({ severity: "WARNING", code: "PRODUCT_MISSING", message: "Produk WooCommerce tidak ditemukan; kandidat produk baru." });
  if (product && !images.length && !product.imageUrls.length) issues.push({ severity: "WARNING", code: "PHOTO_MISSING", message: "Produk belum mempunyai foto baru maupun foto WooCommerce." });
  if (suggestedSku && product?.sku && normalizeSku(product.sku) !== suggestedSku) issues.push({ severity: "WARNING", code: "SKU_NORMALIZATION", message: `SKU parent ${product.sku} disarankan menjadi ${suggestedSku}; nama, SKU variation, dan folder foto konsisten.` });
  const values = variantValues(product ?? ({ attributes: [] } as unknown as WooCommerceImportProduct), variations);
  const variantPhotos = folders.filter((folder) => folder.variantHint).map((folder) => { const hint = normalizeVariantHint(folder.variantHint!); const exactValue = values.find((value) => normalizeAttributeValue(value) === hint); const fuzzy = exactValue ?? values.find((value) => normalizeAttributeValue(value).startsWith(hint) || hint.startsWith(normalizeAttributeValue(value))); if (!exactValue) issues.push({ severity: "WARNING", code: "VARIANT_HINT_REVIEW", message: `Folder ${folder.folderName}: hint ${folder.variantHint} ${fuzzy ? `mendekati ${fuzzy}` : "belum cocok"}; pilih variant saat fase import.` }); return { hint: folder.variantHint!, matchedValue: fuzzy ?? null, count: folder.assets.filter((asset) => asset.type === "IMAGE").length, exact: Boolean(exactValue) }; });
  for (const variation of variations.filter((item) => !item.sku)) issues.push({ severity: "WARNING", code: "EMPTY_VARIATION_SKU", message: `Variation ${variation.internalKey} tidak mempunyai SKU; dipertahankan dengan identity internal.` });
  const glbAssets = folders.flatMap((folder) => folder.assets.filter((asset) => asset.type === "GLB")); const videoAssets = folders.flatMap((folder) => folder.assets.filter((asset) => asset.type === "VIDEO"));
  if (glbAssets.length) issues.push({ severity: "WARNING", code: "GLB_IGNORED", message: `${glbAssets.length} aset GLB ditemukan dan diabaikan pada Phase 1.` }); if (videoAssets.length) issues.push({ severity: "WARNING", code: "VIDEO_IGNORED", message: `${videoAssets.length} video ditemukan dan diabaikan pada Phase 1.` });
  if (images[0]) issues.push({ severity: "INFO", code: "COVER_SUGGESTED", message: `Suggested cover: ${images[0].name}` });
  const hasError = issues.some((issue) => issue.severity === "ERROR"); const hasWarning = issues.some((issue) => issue.severity === "WARNING");
  const status = hasError ? "DUPLICATE_IMAGE_FOLDER" : !product ? "PRODUCT_MISSING" : !images.length && !product.imageUrls.length ? "PHOTO_MISSING" : hasWarning ? "MATCHED_WITH_WARNING" : "MATCHED";
  return { key: `${product?.sourceId ?? "photo"}:${sku}`, sourceSku: product?.sku ?? null, normalizedSku: normalizeSku(product?.sku) || sku, suggestedSku, product, variations, folders, images, glbAssets, videoAssets, variantPhotos, suggestedCover: images[0]?.relativePath ?? null, photoSource: images.length ? "NEW_LOCAL_PHOTOS" : product?.imageUrls.length ? "LEGACY_WOOCOMMERCE" : "NONE", status, issues, isReadyForImport: Boolean(product) && !hasError };
}

export function createProductImportPreview(wooCsv: string, manifestCsv: string): ProductImportPreview {
  const index = parseWooCommerceCsv(wooCsv); const manifestAssets = parsePhotoManifest(manifestCsv); const folders = foldersFromAssets(manifestAssets, index); const assignedPaths = new Set(folders.flatMap((folder) => folder.assets.map((asset) => asset.relativePath))); const unassignedAssets = manifestAssets.filter((asset) => !assignedPaths.has(asset.relativePath)); const used = new Set<string>(); const products: ProductImportPreviewItem[] = [];
  for (const parent of index.parents) { const sku = normalizeSku(parent.sku); const direct = folders.filter((folder) => folder.baseSku === sku); const anomaly = direct.length ? null : folders.find((folder) => anomalyFor(folder, index)?.sourceId === parent.sourceId); const selected = direct.length ? direct : anomaly ? folders.filter((folder) => folder.baseSku === anomaly.baseSku) : []; selected.forEach((folder) => used.add(folder.path)); products.push(makeItem(parent, selected, index, anomaly?.baseSku ?? null)); }
  for (const folder of folders.filter((item) => !used.has(item.path))) { const siblings = folders.filter((item) => item.baseSku === folder.baseSku); siblings.forEach((item) => used.add(item.path)); products.push(makeItem(null, siblings, index)); }
  const unassignedImages = unassignedAssets.filter((asset) => asset.type === "IMAGE");
  const warningIssues = products.flatMap((item) => item.issues).filter((issue) => issue.severity === "WARNING");
  const errorIssues = products.flatMap((item) => item.issues).filter((issue) => issue.severity === "ERROR");
  const warningCategories: Record<string, string> = { PHOTO_MISSING: "Missing local photo", EMPTY_VARIATION_SKU: "Variation without SKU", VARIANT_HINT_REVIEW: "Variant mapping review", SKU_NORMALIZATION: "SKU normalization suggestion", PRODUCT_MISSING: "Photo-only product", GLB_IGNORED: "Non-image asset ignored", VIDEO_IGNORED: "Non-image asset ignored" };
  const categoryCounts = new Map<string, number>();
  for (const issue of warningIssues) { const category = warningCategories[issue.code] ?? "Other"; categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1); }
  if (unassignedImages.length) categoryCounts.set("Unassigned image", unassignedImages.length);
  const warningEvents = warningIssues.length + unassignedImages.length;
  const productsWithWarnings = products.filter((item) => item.issues.some((issue) => issue.severity === "WARNING")).length;
  const productsWithErrors = products.filter((item) => item.issues.some((issue) => issue.severity === "ERROR")).length;
  const assignedImages = folders.flatMap((folder) => folder.assets).filter((asset) => asset.type === "IMAGE").length;
  const localPhotoMatchedProducts = products.filter((item) => item.product && item.photoSource === "NEW_LOCAL_PHOTOS").length;
  const photoOnlyProducts = products.filter((item) => !item.product && item.images.length > 0).length;
  const legacyPhotoOnlyProducts = products.filter((item) => item.product && item.photoSource === "LEGACY_WOOCOMMERCE").length;
  const noPhotoProducts = products.filter((item) => item.product && item.photoSource === "NONE").length;
  return { products, unassignedAssets, warningBreakdown: [...categoryCounts].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)), summary: { wooRows: index.rows.length, parentProducts: index.parents.length, simpleProducts: index.parents.filter((p) => p.productType === "simple").length, variableProducts: index.parents.filter((p) => p.productType === "variable").length, variations: index.rows.filter((p) => p.productType === "variation").length, externalProducts: index.parents.filter((p) => p.productType === "external").length, photoFolders: folders.length, basePhotoSkus: new Set(folders.map((folder) => folder.baseSku)).size, totalImageFiles: manifestAssets.filter((asset) => asset.type === "IMAGE").length, assignedImages, unassignedImages: unassignedImages.length, localPhotoMatchedProducts, photoOnlyProducts, legacyPhotoOnlyProducts, noPhotoProducts, productsWithWarnings, warningEvents, productsWithErrors, errorEvents: errorIssues.length, matched: products.filter((p) => p.status === "MATCHED").length, matchedWithWarnings: products.filter((p) => p.status === "MATCHED_WITH_WARNING").length, photoMissing: products.filter((p) => p.status === "PHOTO_MISSING").length, productMissing: products.filter((p) => p.status === "PRODUCT_MISSING").length, duplicateFolders: products.filter((p) => p.status === "DUPLICATE_IMAGE_FOLDER").length, errors: errorIssues.length, warnings: warningEvents } };
}
