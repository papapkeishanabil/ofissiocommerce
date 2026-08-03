const STEPS = [
  { n: "01", title: "Pilih Produk", desc: "Pilih dari katalog ready stock kami sesuai kebutuhan tim Anda." },
  { n: "02", title: "Kirim Logo", desc: "Upload logo perusahaan Anda dan tentukan posisi bordir yang diinginkan." },
  { n: "03", title: "Proses Bordir", desc: "Tim kami menjahit logo dengan presisi tinggi di fasilitas in-house." },
  { n: "04", title: "Kirim ke Perusahaan", desc: "Produk dikirim langsung ke alamat tim Anda, siap dipakai." },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28" style={{ background: "linear-gradient(180deg,#070d1c 0%,#0b1a4d 60%,#050a25 100%)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "54px 54px", maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%,#000 30%,transparent 78%)" }} />
      <div className="relative mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <span className="animate-fade-in-up type-eyebrow inline-flex items-center gap-2 text-ochre-300" style={{ animationDelay: "0.1s" }}>
            <span className="inline-block h-px w-8 bg-ochre-400 align-middle" /> Cara Order
          </span>
          <h2 className="animate-fade-in-up type-display mt-5 text-white" style={{ fontSize: "clamp(2rem,4.5vw,3.25rem)", animationDelay: "0.25s" }}>
            4 langkah, selesai<br /><span className="text-ochre-400">dalam hitungan hari.</span>
          </h2>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px lg:block" style={{ background: "linear-gradient(90deg,transparent,rgba(232,169,42,.35) 15%,rgba(74,107,216,.35) 85%,transparent)" }} />
          {STEPS.map((s, i) => (
            <div key={s.n} className="animate-fade-in-up group relative" style={{ animationDelay: `${0.4 + i * 0.15}s` }}>
              <div className="relative grid h-16 w-16 place-items-center rounded-full border border-ochre-400/30 bg-[#0b1a4d]/90 shadow-[0_0_24px_rgba(232,169,42,.12),inset_0_0_14px_rgba(74,107,216,.2)] transition-all duration-300 group-hover:border-ochre-400/70 group-hover:shadow-[0_0_32px_rgba(232,169,42,.3)]">
                <span className="text-xl font-bold text-ochre-400">{s.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white transition-colors group-hover:text-ochre-300">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
