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
    <section className="relative overflow-hidden bg-brand-700 py-20 text-white lg:py-28">
      {/* atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(800px 500px at 100% 0%, rgba(220,152,20,0.12), transparent 60%)," +
            "radial-gradient(600px 400px at 0% 100%, rgba(0,18,74,0.6), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <span className="type-eyebrow text-ochre-400">
            <span className="mr-2 inline-block h-px w-8 bg-ochre-400 align-middle" />
            Cara Order
          </span>
          <h2
            className="type-display mt-5"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            4 langkah, selesai
            <br />
            dalam hitungan hari.
          </h2>
        </div>

        {/* steps — horizontal on desktop, big numbers dominant */}
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="group bg-brand-700/40 p-8">
              <span
                className="type-display-tight block text-ochre-400"
                style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)" }}
              >
                {s.n}
              </span>
              <h3
                className="type-display mt-4 text-2xl"
                style={{ fontWeight: 600 }}
              >
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
