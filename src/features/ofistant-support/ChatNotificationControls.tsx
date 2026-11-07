"use client";
import { useState, useSyncExternalStore } from "react";
import { Bell, CircleHelp, Volume2, VolumeX } from "lucide-react";
import { AdminPushToggle } from "@/features/admin-notifications/components/AdminPushToggle";
import { chatSoundEnabled, chatSoundServerSnapshot, playChatSound, setChatSound, subscribeChatSound } from "./chat-sound";
export function ChatNotificationControls() {
  const sound = useSyncExternalStore(subscribeChatSound, chatSoundEnabled, chatSoundServerSnapshot);
  const [error, setError] = useState("");
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-[#d4deef] bg-white px-4 py-3 text-sm font-semibold text-[#122162]"><Bell size={21} />Notifikasi</summary><div className="absolute right-0 z-40 mt-2 w-80 max-w-[85vw] rounded-xl border border-[#d4deef] bg-white p-4 shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-40 max-sm:w-auto"><AdminPushToggle expanded /></div></details>
    <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-[#d4deef] bg-white px-4 py-3 text-sm font-semibold text-[#122162]">{sound ? <Volume2 size={21} /> : <VolumeX size={21} />}Suara</summary><div className="absolute right-0 z-40 mt-2 flex w-72 max-w-[85vw] flex-wrap gap-2 rounded-xl border border-[#d4deef] bg-white p-4 shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-40 max-sm:w-auto">
    <button type="button" aria-pressed={sound} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d4deef] bg-white px-3 text-[#122162]" onClick={async () => { try { await setChatSound(!sound); setError(""); } catch { setError("Suara belum dapat diaktifkan. Periksa pengaturan audio browser lalu coba lagi."); } }}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}{sound ? "Suara aktif" : "Aktifkan suara"}</button>
    {sound && <button type="button" className="min-h-11 rounded-lg px-3 text-[#122162] underline" onClick={playChatSound}>Tes suara</button>}
    </div></details>
    <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-[#d4deef] bg-white px-4 py-3 text-sm font-semibold text-[#122162]"><CircleHelp size={21} />Bantuan</summary><div className="absolute right-0 z-40 mt-2 w-72 max-w-[85vw] space-y-3 rounded-xl border border-[#d4deef] bg-white p-4 text-xs leading-relaxed text-[#526384] shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-40 max-sm:w-auto">
      <strong className="text-[#122162]">Notifikasi di PC dan HP</strong><p>Tekan Aktifkan notifikasi, lalu pilih Izinkan pada browser. Aktifkan pada setiap perangkat yang digunakan.</p><p>iPhone/iPad: tambahkan Ofissio ke Layar Utama, buka dari ikon aplikasi, lalu aktifkan notifikasi.</p><p>Suara notifikasi aktif secara default. Klik atau ketuk halaman, atau gunakan keyboard, agar browser mengizinkan suara. Suara berbunyi untuk chat baru saat halaman admin terbuka dan sedang digunakan. Tekan Suara aktif untuk membisukan; pilihan Anda tetap tersimpan setelah halaman dimuat ulang.</p><p>Suara notifikasi di latar belakang mengikuti pengaturan perangkat, termasuk mode senyap dan Jangan Ganggu.</p>
    </div></details>
    {error && <p role="alert" className="w-full text-red-700">{error}</p>}
  </div>;
}
