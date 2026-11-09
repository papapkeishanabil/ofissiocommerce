import { z } from "zod";
import type { OfistantKnowledgeArticle } from "@/features/ofistant-knowledge/ofistant-knowledge.types";
import type { OfistantResponse } from "./ofistant.types";
import { conversationKindSchema, conversationResponse } from "./ofistant-conversation";

export const knowledgeDecisionSchema = z.object({
  route: z.enum(["knowledge", "application", "clarify", "unavailable", "conversation"]),
  evidence: z.array(z.object({ articleId: z.string(), quote: z.string() })).max(3),
  conversationKind: conversationKindSchema.optional(),
});

export type KnowledgeDecision = z.infer<typeof knowledgeDecisionSchema>;
export const knowledgeAssessmentSchema = z.object({
  requests: z.array(z.object({
    question: z.string(),
    decision: knowledgeDecisionSchema,
  })).min(1).max(5),
});

// Assess each part separately so a supported clause cannot hide an unsupported
// clause in the same customer question. Model-authored questions are never shown.
export function combineKnowledgeAssessment(assessment: unknown): KnowledgeDecision {
  const parsed = knowledgeAssessmentSchema.safeParse(assessment);
  if (!parsed.success) return { route: "unavailable", evidence: [] };
  const decisions = parsed.data.requests.map((request) => request.decision);
  // A serious disclosure overrides banter. Otherwise a real business request
  // takes priority over jokes/greetings included in the same message.
  const distress = decisions.find((decision) => decision.route === "conversation" && decision.conversationKind === "distress");
  if (distress) return distress;
  for (const route of ["unavailable", "clarify", "application"] as const) {
    if (decisions.some((decision) => decision.route === route)) return { route, evidence: [] };
  }
  if (decisions.every((decision) => decision.route === "conversation")) {
    return decisions.find((decision) => decision.conversationKind === "serious") ?? decisions.at(-1)!;
  }
  const evidence = decisions.filter((decision) => decision.route === "knowledge").flatMap((decision) => decision.evidence);
  if (!evidence.length || evidence.length > 3) return { route: "unavailable", evidence: [] };
  return { route: "knowledge", evidence };
}
export interface KnowledgeInput {
  message: string;
  history: { role: "user" | "assistant" | "system"; text: string }[];
}
export type KnowledgeResolution =
  | { route: "application" }
  | { route: "reply"; source: "knowledge-base" | "knowledge-clarification" | "knowledge-unavailable" | "conversation"; result: OfistantResponse };

export function knowledgeUnavailable(temporary = false): KnowledgeResolution {
  return {
    route: "reply", source: "knowledge-unavailable",
    result: {
      message: temporary
        ? "Mohon maaf, saat ini saya belum dapat memeriksa informasi resminya. Silakan coba kembali beberapa saat lagi, atau hubungi tim Ofissio agar kami dapat membantu memastikan jawabannya."
        : "Mohon maaf, informasi yang tersedia belum cukup untuk memastikan jawabannya. Tim Ofissio dapat membantu memeriksanya lebih lanjut.",
      quickReplies: ["Bantuan tim Ofissio", "Lihat katalog"],
    },
  };
}

// Only explicit UI navigation bypasses semantic classification. This is not a
// keyword gate for FAQs: every other phrasing, including typos, reaches the model.
export function isDirectKnowledgeBypass(message: string) {
  return /^(?:(?:lihat|buka|kembali ke) (?:katalog|keranjang)|(?:lanjut|lanjutkan|buka) checkout|(?:hubungi|bantuan) (?:tim ofissio|cs)|ya,? teruskan ke cs)[.!]?$/i.test(message.trim());
}

function normalizeQuote(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function renderKnowledgeDecision(decision: unknown, articles: OfistantKnowledgeArticle[], history: KnowledgeInput["history"] = []): KnowledgeResolution {
  const parsed = knowledgeDecisionSchema.safeParse(decision);
  if (!parsed.success) return knowledgeUnavailable(true);
  const { route, evidence } = parsed.data;
  if (route === "conversation") {
    if (evidence.length || !parsed.data.conversationKind) return knowledgeUnavailable(true);
    return { route: "reply", source: "conversation", result: conversationResponse(parsed.data.conversationKind, history) };
  }
  if (route === "application") return evidence.length ? knowledgeUnavailable(true) : { route };
  if (route === "clarify") return {
    route: "reply", source: "knowledge-clarification",
    result: {
      message: "Boleh dijelaskan sedikit lebih lanjut mengenai hal yang ingin Anda ketahui? Saya ingin memastikan jawaban yang diberikan sesuai dengan kebutuhan Anda.",
      quickReplies: ["Bantuan tim Ofissio"],
    },
  };
  if (route === "unavailable") return knowledgeUnavailable();
  if (!evidence.length) return knowledgeUnavailable(true);
  const selected: OfistantKnowledgeArticle[] = [];
  for (const item of evidence) {
    const article = articles.find((a) => a.id === item.articleId && a.status === "published");
    const quote = normalizeQuote(item.quote);
    if (!article?.answer.trim() || quote.length < 12 || !normalizeQuote(article.answer).includes(quote)) {
      return knowledgeUnavailable(true);
    }
    if (!selected.some((a) => a.id === article.id)) selected.push(article);
  }
  // The model selects evidence; it never writes business facts or app actions.
  // Return the entire official answer so qualifications/conditions stay intact.
  return {
    route: "reply", source: "knowledge-base",
    result: {
      message: selected.map((a) => a.answer.trim()).join("\n\n"),
      quickReplies: ["Lihat katalog", "Bantuan tim Ofissio"],
    },
  };
}

export async function resolveKnowledgeReply(input: KnowledgeInput, dependencies: {
  loadArticles: () => Promise<OfistantKnowledgeArticle[]>;
  select: (input: KnowledgeInput, articles: OfistantKnowledgeArticle[]) => Promise<unknown>;
}): Promise<KnowledgeResolution> {
  if (isDirectKnowledgeBypass(input.message)) return { route: "application" };
  let stage: "articles" | "model" = "articles";
  try {
    const articles = (await dependencies.loadArticles()).filter((a) => a.status === "published" && a.answer.trim());
    // Do not silently discard older articles via slice(0, 40). Bound the payload
    // explicitly instead of returning an answer from an incomplete knowledge set.
    if (JSON.stringify(articles).length > 120_000) return knowledgeUnavailable(true);
    const conversation = { ...input, history: input.history.filter((m) => m.role !== "system").slice(-10) };
    stage = "model";
    const decision = await dependencies.select(conversation, articles);
    return renderKnowledgeDecision(decision, articles, conversation.history);
  } catch (error) {
    // Neither raw provider errors nor customer text/secrets belong in logs.
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    console.warn("[ofistant-knowledge] Official knowledge could not be verified", { stage, reason: timeout ? "timeout" : "request-failed" });
    return knowledgeUnavailable(true);
  }
}
