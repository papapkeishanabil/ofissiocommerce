-- Ofistant managed knowledge base. Writes are server-side only.
create table if not exists public.ofistant_knowledge_articles (
  id text primary key,
  title text not null,
  category text not null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by text null,
  updated_by text null,
  published_by text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ofistant_knowledge_status_updated
on public.ofistant_knowledge_articles(status, updated_at desc);

alter table public.ofistant_knowledge_articles enable row level security;
alter table public.ofistant_knowledge_articles force row level security;
revoke all on public.ofistant_knowledge_articles from anon, authenticated;
grant all on public.ofistant_knowledge_articles to service_role;

