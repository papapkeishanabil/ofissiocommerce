-- Apply to isolated preview first. Never run automatically on production.
begin;
create table if not exists public.ofistant_conversations (
  id uuid primary key,
  user_id text not null,
  company_id text not null,
  title text not null check (length(title) between 1 and 120),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists ofistant_conversations_owner_idx
  on public.ofistant_conversations(user_id, company_id, updated_at desc, id);
create table if not exists public.ofistant_conversation_turns (
  conversation_id uuid not null references public.ofistant_conversations(id) on delete cascade,
  turn_id uuid not null,
  sequence bigint generated always as identity,
  messages jsonb not null check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) = 2),
  primary key(conversation_id, turn_id)
);
create index if not exists ofistant_turns_sequence_idx
  on public.ofistant_conversation_turns(conversation_id, sequence desc);
alter table public.ofistant_conversations enable row level security;
alter table public.ofistant_conversation_turns enable row level security;
revoke all on public.ofistant_conversations, public.ofistant_conversation_turns from anon, authenticated;

-- Only the server service role can call this function. Ownership is supplied
-- from the validated customer cookie, never browser user/company identifiers.
create or replace function public.ofistant_history_command(
  p_user_id text, p_company_id text, p_action text, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_owner public.ofistant_conversations%rowtype;
  v_rows jsonb;
  v_before bigint;
  v_offset integer;
  v_inserted integer;
begin
  if coalesce(p_user_id, '') = '' or coalesce(p_company_id, '') = '' then
    raise exception 'HISTORY_NOT_FOUND';
  end if;
  if p_action = 'list' then
    v_offset := greatest(0, least(coalesce((p_payload->>'offset')::integer, 0), 100000));
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_rows from (
      select id, title, updated_at as "updatedAt" from public.ofistant_conversations
      where user_id = p_user_id and company_id = p_company_id
      order by updated_at desc, id limit 21 offset v_offset
    ) t;
    return jsonb_build_object('conversations', case when jsonb_array_length(v_rows) > 20 then v_rows - 20 else v_rows end,
      'nextOffset', case when jsonb_array_length(v_rows) > 20 then v_offset + 20 else null end);
  end if;
  v_id := (p_payload->>'conversationId')::uuid;
  if p_action = 'append' then
    insert into public.ofistant_conversations(id, user_id, company_id, title)
      values(v_id, p_user_id, p_company_id, left(p_payload->>'title', 120)) on conflict(id) do nothing;
  end if;
  select * into v_owner from public.ofistant_conversations
    where id = v_id and user_id = p_user_id and company_id = p_company_id for update;
  if not found then raise exception 'HISTORY_NOT_FOUND'; end if;
  if p_action = 'append' then
    if jsonb_array_length(p_payload->'messages') <> 2 then raise exception 'HISTORY_INVALID'; end if;
    insert into public.ofistant_conversation_turns(conversation_id, turn_id, messages)
      values(v_id, (p_payload->>'turnId')::uuid, p_payload->'messages')
      on conflict(conversation_id, turn_id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then update public.ofistant_conversations set updated_at = now() where id = v_id; end if;
    return jsonb_build_object('saved', true);
  elsif p_action = 'read' then
    v_before := coalesce((p_payload->>'before')::bigint, 9223372036854775807);
    -- Pagination cursor is the first turn sequence returned, exclusive next time.
    select coalesce(jsonb_agg(t order by sequence), '[]'::jsonb) into v_rows from (
      select sequence, messages from public.ofistant_conversation_turns
      where conversation_id = v_id and sequence < v_before order by sequence desc limit 20
    ) t;
    return jsonb_build_object(
      'messages', (select coalesce(jsonb_agg(m order by (t->>'sequence')::bigint, ordinal), '[]'::jsonb)
        from jsonb_array_elements(v_rows) t, jsonb_array_elements(t->'messages') with ordinality as entry(m, ordinal)),
      'before', case when exists(select 1 from public.ofistant_conversation_turns
        where conversation_id = v_id and sequence < (v_rows->0->>'sequence')::bigint)
        then (v_rows->0->>'sequence')::bigint else null end
    );
  end if;
  raise exception 'HISTORY_INVALID';
end;
$$;
revoke all on function public.ofistant_history_command(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ofistant_history_command(text, text, text, jsonb) to service_role;
commit;
