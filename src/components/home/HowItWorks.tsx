// src/components/home/HowItWorks.tsx
// Bold editorial 4-step timeline. Big numbers, minimal decoration.

const STEPS = [
  {
    n: "01",
    title: "Pilih Produk",
    desc: "Pilih dari katalog ready stock kami sesuai kebutuhan tim Anda.",
  },
  {
    n: "02",
    title: "Kirim Logo",
    desc: "Upload logo perusahaan Anda dan tentukan posisi bordir yang diinginkan.",
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
    <section
      className="relative overflow-hidden py-20 lg:py-28"
      style={{
        background:
          "linear-gradient(180deg, #eff4ff 0%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <span className="type-eyebrow text-brand-700">
            <span className="mr-2 inline-block h-px w-8 bg-brand-700 align-middle" />
            Cara Order
          </span>
          <h2
            className="type-display mt-5 text-brand-700"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)" }}
          >
            4 langkah, selesai
            <br />
            dalam hitungan hari.
          </h2>
        </div>

        {/* steps grid */}
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="group bg-surface p-8 transition-colors duration-300 hover:bg-brand-700">
              <div className="flex items-baseline gap-3">
                <span
                  className="type-display-tight text-brand-400 transition-colors group-hover:text-ochre-400"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}
                >
                  {s.n}
                </span>
                <span className="type-mono-label text-ink-subtle transition-colors group-hover:text-brand-200">
                  /
                </span>
              </div>
              <h3
                className="type-display mt-4 text-xl text-brand-700 transition-colors group-hover:text-white"
                style={{ fontWeight: 600 }}
              >
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted transition-colors group-hover:text-brand-100">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
