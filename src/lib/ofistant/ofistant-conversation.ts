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
  greeting: ["Selamat datang. Dengan senang hati saya membantu. Ada yang ingin Anda tanyakan?", "Halo, saya Ofistant. Silakan sampaikan kebutuhan Anda, saya siap membantu."],
  thanks: ["Sama-sama. Senang dapat membantu Anda.", "Dengan senang hati. Silakan hubungi kami kembali jika ada yang ingin ditanyakan."],
  sky_trip: ["Untuk perjalanan imajinasi seperti itu, saya dapat menemani lewat percakapan ini saja.", "Menarik untuk dibayangkan. Saya menemani Anda melalui percakapan ini, ya."],
  sky_ladder: ["Jika dalam cerita imajinasi, tentu bisa dibayangkan. Untuk keselamatan, cukup menjadi cerita saja, ya.", "Kita jadikan bagian dari cerita imajinasi saja, ya. Saya tetap menemani melalui percakapan ini."],
  invitation: ["Terima kasih sudah mengajak. Saya menemani melalui percakapan ini saja, ya.", "Dengan senang hati saya menemani Anda berbincang di sini."],
  banter: ["Terima kasih sudah mencairkan suasana. Senang dapat berbincang dengan Anda.", "Saya memahami candaannya. Senang dapat menemani percakapan Anda."],
  off_topic: ["Mohon maaf, topik tersebut berada di luar bidang bantuan saya. Saya dapat membantu informasi seputar produk dan layanan Ofissio.", "Mohon maaf, saya belum dapat memastikan jawaban untuk topik tersebut. Jika ada kebutuhan terkait Ofissio, dengan senang hati saya membantu."],
  serious: ["Baik, saya memahami. Silakan sampaikan hal yang ingin Anda tanyakan, saya akan menanggapinya dengan sungguh-sungguh.", "Tentu, saya siap membantu. Boleh dijelaskan lebih lanjut mengenai kebutuhan Anda?"],
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
