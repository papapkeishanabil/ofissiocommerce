"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  PackageCheck,
  Plus,
  Shirt,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  RolePackageConfig,
} from "@/features/role-packages/role-package.config";
import { useCartStore } from "@/stores/cart-store";
import { formatIDR } from "@/types/product";

import styles from "./RolePackageBuilder.module.css";

export type RolePackageProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  priceFrom: number;
  moq: number;
  mainImage?: string | null;
  colors: string[];
  availableSizes: string[];
  supportsEmbroidery: boolean;
  has3DModel: boolean;
  searchableTerms: string[];
  categorySlugs: string[];
};

type RoleLink = {
  role: string;
  label: string;
};

type Props = {
  config: RolePackageConfig;
  products: RolePackageProduct[];
  siblingRoles: RoleLink[];
};

type StoredDraft = {
  version: 1;
  selectedProductIds: string[];
};

function productHaystack(product: RolePackageProduct) {
  return [
    product.name,
    product.sku,
    product.category,
    ...product.searchableTerms,
    ...product.categorySlugs,
  ]
    .join(" ")
    .toLocaleLowerCase("id-ID");
}

function productMatches(product: RolePackageProduct, keywords: readonly string[]) {
  const haystack = productHaystack(product);
  return keywords.some((keyword) => haystack.includes(keyword.toLocaleLowerCase("id-ID")));
}

export function RolePackageBuilder({ config, products, siblingRoles }: Props) {
  const cartItems = useCartStore((state) => state.items);
  const cartHydrated = useCartStore((state) => state.hydrated);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const storageKey = `ofissio-role-package:${config.business}:${config.role}`;

  const groupedProducts = useMemo(
    () => config.groups.map((group) => ({
      group,
      products: products.filter((product) => productMatches(product, group.keywords)).slice(0, 4),
    })),
    [config.groups, products],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as StoredDraft;
        if (draft.version === 1 && Array.isArray(draft.selectedProductIds)) {
          const availableIds = new Set(products.map((product) => product.id));
          setSelectedProductIds(draft.selectedProductIds.filter((id) => availableIds.has(id)));
        }
      }
    } catch {
      // A broken browser draft should never block the package page.
    } finally {
      setDraftHydrated(true);
    }
  }, [products, storageKey]);

  useEffect(() => {
    if (!draftHydrated) return;
    const draft: StoredDraft = { version: 1, selectedProductIds };
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draftHydrated, selectedProductIds, storageKey]);

  const selectedProducts = selectedProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is RolePackageProduct => Boolean(product));

  const configuredCount = selectedProducts.filter((product) =>
    cartItems.some((item) => item.productId === product.id && item.totalQty > 0),
  ).length;

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };

  const useRecommendation = () => {
    const recommendation = config.recommendedGroupIds.flatMap((groupId) => {
      const group = groupedProducts.find((entry) => entry.group.id === groupId);
      return group?.products[0] ? [group.products[0].id] : [];
    });
    setSelectedProductIds(Array.from(new Set(recommendation)));
  };

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Beranda</Link><span>/</span>
        <Link href="/inspirasi/kafe-restoran">Inspirasi</Link><span>/</span>
        <span>{config.businessLabel}</span><span>/</span><strong>{config.roleLabel}</strong>
      </nav>

      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <Link className={styles.backLink} href="/inspirasi/kafe-restoran">← Kembali ke inspirasi {config.businessLabel.toLowerCase()}</Link>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          <div className={styles.roleNav} aria-label={`Pilih peran ${config.businessLabel}`}>
            {siblingRoles.map((role) => (
              <Link
                key={role.role}
                href={`/paket/${config.business}/${role.role}`}
                aria-current={role.role === config.role ? "page" : undefined}
              >
                {role.label}
              </Link>
            ))}
          </div>
        </div>
        <figure className={styles.heroFigure}>
          {/* Product inspiration assets are local and intentionally preserve their editorial crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.heroImage} alt={config.heroAlt} />
        </figure>
      </section>

      <section className={styles.recommendation} aria-labelledby="recommendation-title">
        <Sparkles aria-hidden="true" />
        <div>
          <h2 id="recommendation-title">Mulai dari rekomendasi, atau pilih sendiri</h2>
          <p>{config.recommendation} Rekomendasi hanya mengisi daftar; semua produk tetap bisa diganti.</p>
        </div>
        <button type="button" onClick={useRecommendation}>Gunakan rekomendasi</button>
        <button type="button" className={styles.clearButton} onClick={() => setSelectedProductIds([])}>Mulai kosong</button>
      </section>

      <div className={styles.builderLayout}>
        <div className={styles.catalogColumn}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Pilih isi paket</h2>
              <p>Tambahkan model yang diinginkan. Quantity, ukuran, warna, dan bordir diatur setelah produk dipilih.</p>
            </div>
            <span>{products.length} produk katalog tersedia</span>
          </div>

          {groupedProducts.map(({ group, products: groupProducts }, groupIndex) => (
            <section className={styles.productGroup} key={group.id} aria-labelledby={`group-${group.id}`}>
              <div className={styles.groupHeading}>
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                <div><h3 id={`group-${group.id}`}>{group.label}</h3><p>{group.description}</p></div>
              </div>

              {groupProducts.length ? (
                <div className={styles.productGrid}>
                  {groupProducts.map((product) => {
                    const selected = selectedProductIds.includes(product.id);
                    return (
                      <article className={`${styles.productCard} ${selected ? styles.productSelected : ""}`} key={product.id}>
                        <Link className={styles.productImage} href={`/product/${product.slug}`} aria-label={`Lihat ${product.name}`}>
                          {product.mainImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.mainImage} alt={product.name} loading="lazy" />
                          ) : <Shirt aria-hidden="true" />}
                          {selected ? <span className={styles.selectedBadge}><Check aria-hidden="true" /> Dipilih</span> : null}
                        </Link>
                        <div className={styles.productInfo}>
                          <p className={styles.productMeta}>{product.category} · {product.sku}</p>
                          <h4><Link href={`/product/${product.slug}`}>{product.name}</Link></h4>
                          <p className={styles.price}>Mulai {formatIDR(product.priceFrom)} <span>/ pcs</span></p>
                          <div className={styles.productFacts}>
                            <span>MOQ produk {product.moq} pcs</span>
                            {product.supportsEmbroidery ? <span>Bisa bordir</span> : null}
                          </div>
                          <button type="button" onClick={() => toggleProduct(product.id)} aria-pressed={selected}>
                            {selected ? <><X aria-hidden="true" /> Keluarkan</> : <><Plus aria-hidden="true" /> Tambahkan ke Paket</>}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyGroup}>
                  <Shirt aria-hidden="true" />
                  <div><strong>Produk {group.label.toLowerCase()} belum tersedia di katalog.</strong><p>Tim Ofissio tetap dapat membantu menyiapkan kebutuhan ini.</p></div>
                  <Link href={`/catalog?kategori=${encodeURIComponent(group.catalogTerm)}`}>Lihat katalog <ArrowRight aria-hidden="true" /></Link>
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className={styles.packagePanel} aria-labelledby="package-title">
          <div className={styles.packageTitle}>
            <div><PackageCheck aria-hidden="true" /><h2 id="package-title">Paket Anda</h2></div>
            <span>{selectedProducts.length} jenis produk</span>
          </div>
          <p className={styles.packageHelp}>Pilihan tersimpan otomatis. Produk baru masuk ke pesanan setelah quantity dan ukuran diatur.</p>

          {!draftHydrated ? <p className={styles.loading}>Memuat paket tersimpan…</p> : null}
          {draftHydrated && selectedProducts.length === 0 ? (
            <div className={styles.emptyPackage}><ShoppingBag aria-hidden="true" /><strong>Belum ada produk</strong><p>Pilih produk di sebelah kiri untuk mulai menyusun paket.</p></div>
          ) : null}

          <div className={styles.packageItems}>
            {selectedProducts.map((product) => {
              const lines = cartHydrated ? cartItems.filter((item) => item.productId === product.id) : [];
              const totalQty = lines.reduce((total, line) => total + line.totalQty, 0);
              const primaryLine = lines[0];
              const embroideryCount = lines.reduce((total, line) => total + (line.uniform3DConfig?.placements.length ?? line.embroideryPlacements?.length ?? 0), 0);
              return (
                <article key={product.id}>
                  <div className={styles.packageItemTop}>
                    <div><strong>{product.name}</strong><span>{product.sku}</span></div>
                    <button type="button" onClick={() => toggleProduct(product.id)} aria-label={`Keluarkan ${product.name} dari paket`}><X aria-hidden="true" /></button>
                  </div>
                  {totalQty > 0 ? (
                    <p className={styles.configured}><CheckCircle2 aria-hidden="true" /> {totalQty} pcs sudah di keranjang{embroideryCount ? ` · ${embroideryCount} zona bordir` : ""}</p>
                  ) : <p className={styles.unconfigured}>Quantity dan ukuran belum ditentukan</p>}
                  <div className={styles.packageActions}>
                    <Link href={primaryLine ? `/product/${product.slug}?line=${encodeURIComponent(primaryLine.id)}` : `/product/${product.slug}`}>
                      {primaryLine ? "Edit produk" : "Atur quantity & ukuran"} <ArrowRight aria-hidden="true" />
                    </Link>
                    {primaryLine && product.supportsEmbroidery && product.has3DModel ? (
                      <Link href={`/product/${product.slug}?line=${encodeURIComponent(primaryLine.id)}&studio=1`} className={styles.embroideryAction}>Tambah bordir</Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {selectedProducts.length ? (
            <div className={styles.packageFooter}>
              <p><strong>{configuredCount} dari {selectedProducts.length}</strong> jenis produk sudah memiliki quantity.</p>
              {configuredCount > 0 ? (
                <Link href="/cart" className={styles.cartAction}>Tinjau Keranjang <ArrowRight aria-hidden="true" /></Link>
              ) : (
                <span className={styles.disabledAction}>Atur minimal satu produk untuk lanjut</span>
              )}
              <small>Harga akhir, pembagian ukuran, dan biaya bordir mengikuti data pada setiap produk.</small>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
