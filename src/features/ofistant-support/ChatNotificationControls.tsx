"use client";
import { useState, useSyncExternalStore } from "react";
import { CircleHelp, Volume2, VolumeX } from "lucide-react";
import { AdminPushToggle } from "@/features/admin-notifications/components/AdminPushToggle";
import { chatSoundEnabled, chatSoundServerSnapshot, playChatSound, setChatSound, subscribeChatSound } from "./chat-sound";
export function ChatNotificationControls() {
  const sound = useSyncExternalStore(subscribeChatSound, chatSoundEnabled, chatSoundServerSnapshot);
  const [error, setError] = useState("");
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <AdminPushToggle expanded />
    <button type="button" aria-pressed={sound} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d4deef] bg-white px-3 text-[#122162]" onClick={async () => { try { await setChatSound(!sound); setError(""); } catch { setError("Suara belum dapat diaktifkan. Periksa pengaturan audio browser lalu coba lagi."); } }}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}{sound ? "Suara aktif" : "Aktifkan suara"}</button>
    {sound && <button type="button" className="min-h-11 rounded-lg px-3 text-[#122162] underline" onClick={playChatSound}>Tes suara</button>}
    <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 font-semibold text-[#122162]"><CircleHelp size={17} />Panduan</summary><div className="absolute right-0 z-40 mt-2 w-72 max-w-[85vw] space-y-3 rounded-xl border border-[#d4deef] bg-white p-4 text-xs leading-relaxed text-[#526384] shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-40 max-sm:w-auto">
      <strong className="text-[#122162]">Notifikasi di PC dan HP</strong><p>Tekan Aktifkan notifikasi, lalu pilih Izinkan pada browser. Aktifkan pada setiap perangkat yang digunakan.</p><p>iPhone/iPad: tambahkan Ofissio ke Layar Utama, buka dari ikon aplikasi, lalu aktifkan notifikasi.</p><p>Suara aktif berbunyi saat halaman admin terbuka dan sedang digunakan. Setelah memuat ulang halaman, tekan Aktifkan suara kembali. Tekan Suara aktif untuk membisukan.</p><p>Suara notifikasi di latar belakang mengikuti pengaturan perangkat, termasuk mode senyap dan Jangan Ganggu.</p>
    </div></details>
    {error && <p role="alert" className="w-full text-red-700">{error}</p>}
  </div>;
}
