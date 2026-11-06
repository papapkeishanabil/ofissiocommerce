import { z } from "zod";
import type { OfistantResponse } from "./ofistant.types";

// The model selects the conversational intent, never invents shop facts or
// practical instructions for a fantastical/dangerous idea.
export const conversationKindSchema = z.enum([
  "greeting", "thanks", "sky_trip", "sky_ladder", "invitation",
  "banter", "off_topic", "serious", "distress",
]);
export type ConversationKind = z.infer<typeof conversationKindSchema>;

const replies: Record<ConversationKind, readonly string[]> = {
  greeting: [
    "Halo! Ada yang ingin Anda tanyakan?",
    "Halo, saya Ofistant. Silakan, saya siap membantu.",
  ],
  thanks: [
    "Sama-sama! Senang bisa membantu.",
    "Dengan senang hati. Kalau ada pertanyaan lagi, silakan.",
  ],
  sky_trip: [
    "Kalau maksudnya terbang, bisa mulai dari bandara 😊. Saya sendiri fokus membantu urusan seragam.",
    "Kalau perjalanan imajinasi, kita sudah berangkat sejak pertanyaan tadi 😄.",
    "Untuk perjalanan sejauh itu, saya temani lewat chat saja 😄.",
  ],
  sky_ladder: [
    "Sepertinya tangganya harus panjang sekali 😄. Kita cukup membayangkannya saja, ya.",
    "Kalau di dunia imajinasi, tangganya mungkin belum selesai digambar 😄.",
    "Tangga khayalannya boleh panjang, obrolan kita tetap di sini saja 😄.",
  ],
  invitation: [
    "Saya temani lewat chat saja 😄.",
    "Saya ikut meramaikan obrolannya dari sini saja 😄.",
    "Saya kebagian jadi teman ngobrol dari sini 😄.",
  ],
  banter: [
    "Hehe, saya tangkap candaannya 😄.",
    "Obrolannya jadi lebih santai 😄.",
    "Hehe, ada-ada saja 😄.",
  ],
  off_topic: [
    "Untuk hal itu, saya belum bisa memberi jawaban yang dapat diandalkan. Saya fokus membantu kebutuhan seragam Ofissio.",
    "Topik itu di luar bidang bantuan saya. Saya tidak ingin memberi jawaban yang keliru.",
  ],
  serious: [
    "Baik, saya tanggapi dengan serius. Bisa ceritakan lebih jelas hal yang ingin Anda tanyakan?",
    "Saya mengerti. Silakan jelaskan kebutuhan Anda supaya saya bisa mengarahkan dengan tepat.",
  ],
  distress: [
    "Saya ikut prihatin Anda sedang mengalami hal yang berat. Apakah Anda sedang berada di tempat yang aman? Jika ada bahaya langsung, segera hubungi orang terdekat atau layanan darurat setempat.",
    "Keselamatan Anda lebih penting saat ini. Coba hubungi orang yang Anda percaya agar Anda tidak menghadapinya sendirian. Jika ada bahaya langsung, mintalah bantuan darurat setempat.",
  ],
};

export function conversationResponse(
  kind: ConversationKind,
  history: { role: string; text: string }[] = [],
): OfistantResponse {
  const previous = history.filter((entry) => entry.role === "assistant").map((entry) => entry.text.trim());
  const choices = replies[kind];
  // Prefer unused replies within recent context; once exhausted, never repeat
  // the immediately preceding reply. No sales quick replies on social turns.
  const message = choices.find((text) => !previous.includes(text))
    ?? choices.find((text) => text !== previous.at(-1))
    ?? choices[0]!;
  return { message, quickReplies: [] };
}
