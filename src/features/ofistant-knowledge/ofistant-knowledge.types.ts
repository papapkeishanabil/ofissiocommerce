export type OfistantKnowledgeStatus = "draft" | "published" | "archived";

export interface OfistantKnowledgeArticle {
  id: string;
  title: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  status: OfistantKnowledgeStatus;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

