import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { createApiError } from "@/lib/security/safe-error-response";

import type { OfistantKnowledgeArticle, OfistantKnowledgeStatus } from "./ofistant-knowledge.types";

type Row = Record<string, unknown>;

export async function listKnowledgeArticles(status?: OfistantKnowledgeStatus) {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  const rows = await client.select<Row>("ofistant_knowledge_articles", {
    filters: status ? { status } : undefined,
    order: "updated_at.desc",
  });
  return rows.map(mapRow);
}

export function listPublishedKnowledgeArticles() {
  return listKnowledgeArticles("published");
}

export async function createKnowledgeArticle(input: {
  title: string; category: string; question: string; answer: string; keywords: string[]; actorId: string;
}) {
  const client = requireClient();
  const now = new Date().toISOString();
  const rows = await client.insert<Row>("ofistant_knowledge_articles", {
    id: `kb_${randomUUID()}`,
    title: input.title.trim(),
    category: input.category.trim(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    keywords: normalizeKeywords(input.keywords),
    status: "draft",
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
  return mapRow(rows[0]!);
}

export async function updateKnowledgeArticle(input: {
  id: string; title?: string; category?: string; question?: string; answer?: string;
  keywords?: string[]; status?: OfistantKnowledgeStatus; actorId: string; canPublish: boolean;
}) {
  const client = requireClient();
  const patch: Row = { updated_by: input.actorId, updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.question !== undefined) patch.question = input.question.trim();
  if (input.answer !== undefined) patch.answer = input.answer.trim();
  if (input.keywords !== undefined) patch.keywords = normalizeKeywords(input.keywords);
  if (input.status !== undefined) {
    if (!input.canPublish) throw createApiError("FORBIDDEN", "Hanya Super Admin yang dapat menerbitkan atau mengarsipkan artikel.", 403);
    patch.status = input.status;
    if (input.status === "published") {
      patch.published_by = input.actorId;
      patch.published_at = new Date().toISOString();
    }
  }
  const rows = await client.update<Row>("ofistant_knowledge_articles", patch, { id: input.id });
  if (!rows[0]) throw createApiError("NOT_FOUND", "Artikel Knowledge Base tidak ditemukan.", 404);
  return mapRow(rows[0]);
}

function requireClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw createApiError("PROVIDER_UNAVAILABLE", "Supabase belum siap untuk Knowledge Base.", 503);
  return client;
}

function normalizeKeywords(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

function mapRow(row: Row): OfistantKnowledgeArticle {
  return {
    id: String(row.id), title: String(row.title), category: String(row.category),
    question: String(row.question), answer: String(row.answer),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    status: String(row.status) as OfistantKnowledgeStatus,
    createdBy: nullable(row.created_by), updatedBy: nullable(row.updated_by),
    publishedBy: nullable(row.published_by), publishedAt: nullable(row.published_at),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function nullable(value: unknown) { return typeof value === "string" ? value : null; }
