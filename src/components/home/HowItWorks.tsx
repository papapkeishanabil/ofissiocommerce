// src/components/home/HowItWorks.tsx
// 4-step procurement process — educational for first-time B2B buyers.
// Adapted from the Ofissio Workwear homepage reference.

const STEPS = [
  {
    n: "01",
    title: "Pilih Produk",
    desc: "Pilih dari katalog ready stock kami sesuai kebutuhan tim Anda.",
  },
  {
    n: "02",
    title: "Kirim Logo",
    desc: "Upload logo perusahaan Anda dan tentukan posisi bordir.",
  },
  {
    n: "03",
    title: "Proses Bordir",
    desc: "Tim kami menjahit logo dengan presisi tinggi di fasilitas in-house.",
  },
  {
    n: "04",
    title: "Kirim ke Perusahaan",
    desc: "Produk dikirim langsung ke alamat tim Anda, siap dipakai.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface py-14 lg:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Cara Order
          </span>
          <h2 className="font-display mt-2 text-2xl font-extrabold text-ink-strong lg:text-3xl">
            4 langkah, selesai dalam hitungan hari.
          </h2>
        </div>

        <div className="relative mt-12">
          {/* connecting line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block"
          />
          <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col items-center text-center">
                <div className="font-display grid h-14 w-14 place-items-center rounded-full border-4 border-surface bg-brand-600 text-lg font-extrabold text-white shadow-soft-sm">
                  {s.n}
                </div>
                <h4 className="font-display mt-4 text-base font-bold text-ink-strong">
                  {s.title}
                </h4>
                <p className="mt-1.5 max-w-[14rem] text-sm leading-relaxed text-ink-muted">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
