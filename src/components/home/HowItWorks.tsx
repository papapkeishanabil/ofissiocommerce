// src/components/home/HowItWorks.tsx
// 4-step procurement timeline with gradient progress line + numbered nodes.

const STEPS = [
  {
    n: "01",
    title: "Pilih Produk",
    desc: "Pilih dari katalog ready stock kami sesuai kebutuhan tim Anda.",
    icon: "📦",
  },
  {
    n: "02",
    title: "Kirim Logo",
    desc: "Upload logo perusahaan Anda dan tentukan posisi bordir.",
    icon: "🎨",
  },
  {
    n: "03",
    title: "Proses Bordir",
    desc: "Tim kami menjahit logo dengan presisi tinggi di fasilitas in-house.",
    icon: "✂️",
  },
  {
    n: "04",
    title: "Kirim ke Perusahaan",
    desc: "Produk dikirim langsung ke alamat tim Anda, siap dipakai.",
    icon: "🚚",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-surface py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Cara Order
          </span>
          <h2
            className="font-display mt-4 font-extrabold tracking-tight text-ink-strong"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
          >
            4 langkah, selesai dalam{" "}
            <span className="text-gradient-brand">hitungan hari.</span>
          </h2>
        </div>

        <div className="relative mt-14">
          {/* gradient progress line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-1 lg:block"
          >
            <div className="mx-auto h-full w-[78%] rounded-full bg-gradient-to-r from-brand-200 via-brand-400 to-ochre-400" />
          </div>

          <ol className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className="group relative flex flex-col items-center text-center"
              >
                {/* node */}
                <div className="relative z-10">
                  <div className="font-display grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-surface bg-gradient-to-br from-brand-600 to-brand-800 text-lg font-extrabold text-white shadow-soft-md transition-transform duration-300 group-hover:scale-110">
                    <span className="absolute text-2xl opacity-30">
                      {s.icon}
                    </span>
                    <span className="relative">{s.n}</span>
                  </div>
                  {/* pulse dot on hover */}
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-ochre-400 opacity-0 shadow-glow-ochre transition-opacity duration-300 group-hover:opacity-100"
                  />
                </div>
                <h4 className="font-display mt-5 text-base font-bold text-ink-strong">
                  {s.title}
                </h4>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-muted">
                  {s.desc}
                </p>

                {/* arrow connector (mobile) */}
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="mt-6 h-8 w-px bg-gradient-to-b from-brand-300 to-brand-100 sm:hidden"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
