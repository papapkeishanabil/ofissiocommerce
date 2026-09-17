export default function Loading() {
  return (
    <main className="min-h-screen animate-pulse bg-[#07162b]">
      <div className="mx-auto max-w-[1600px] px-6 py-16 lg:px-12">
        <div className="h-3 w-48 rounded-full bg-white/15" />
        <div className="mt-16 h-16 max-w-xl rounded-2xl bg-white/12" />
        <div className="mt-4 h-16 max-w-md rounded-2xl bg-white/10" />
        <div className="mt-8 h-4 max-w-lg rounded-full bg-white/10" />
      </div>
    </main>
  );
}
