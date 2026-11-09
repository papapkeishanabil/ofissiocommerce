/** Buying guidance only; product specifications remain sourced from the catalog. */
export function categorySelectionCopy(slug: string, name: string): string {
  const category = `${slug} ${name}`.toLocaleLowerCase("id-ID");
  if (/safety/.test(category)) {
    return "Untuk memilih kemeja safety, bandingkan bahan, panjang lengan, saku, dan detail reflektor yang tercantum pada masing-masing produk. Sesuaikan dengan persyaratan tempat kerja; nama kategori safety tidak dengan sendirinya menunjukkan sertifikasi atau kemampuan perlindungan tertentu.";
  }
  if (/bengkel|teknisi/.test(category)) {
    return "Pilih kemeja bengkel atau baju bengkel berdasarkan tugas teknisi, mekanik, dan tim pelayanan. Bandingkan potongan, ruang gerak, bahan, panjang lengan, serta kebutuhan saku pada detail produk sebelum menyusun seragam tim.";
  }
  if (/lapangan/.test(category)) {
    return "Pilih kemeja lapangan berdasarkan aktivitas tim dan ketentuan lokasi kerja. Bandingkan bahan, panjang lengan, potongan, serta fungsi saku pada setiap model. Pastikan kebutuhan perlindungan khusus dikonfirmasi berdasarkan spesifikasi produk.";
  }
  if (/kemeja|kantor/.test(category)) {
    return "Pilih kemeja kerja untuk kantor dan operasional berdasarkan peran tim, bahan, potongan, serta pilihan lengan pendek atau panjang. Gunakan tabel ukuran masing-masing model; produk dengan dua pilihan lengan mengikuti varian yang dipilih.";
  }
  return "Sesuaikan pilihan seragam dengan aktivitas dan identitas tim. Bandingkan spesifikasi serta panduan ukuran pada setiap produk sebelum memesan.";
}
