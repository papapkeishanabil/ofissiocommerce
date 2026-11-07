begin;
create table if not exists public.ofistant_customer_contacts (
 user_id text primary key, name text not null, whatsapp text not null default '', notes text not null default '',
 updated_by text not null, updated_at timestamptz not null default now()
);
create table if not exists public.ofistant_materials (
 id uuid primary key default gen_random_uuid(), title text not null, category text not null,
 kind text not null check(kind in ('image','pdf','chart')), storage_key text, mime_type text,
 data jsonb not null default '{}'::jsonb, active boolean not null default true,
 created_by text not null, created_at timestamptz not null default now()
);
alter table public.ofistant_customer_contacts enable row level security;
alter table public.ofistant_materials enable row level security;
revoke all on public.ofistant_customer_contacts,public.ofistant_materials from public,anon,authenticated;
grant all on public.ofistant_customer_contacts,public.ofistant_materials to service_role;
alter table public.ofistant_support_messages add column if not exists attachment jsonb;
create index if not exists ofistant_support_attachment on public.ofistant_support_messages ((attachment->>'resourceId')) where attachment is not null;
create or replace function public.ofistant_contact_update(p_conversation uuid,p_name text,p_whatsapp text,p_notes text,p_actor text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user text;
begin
 select c.user_id into v_user from ofistant_conversations c join ofistant_support_sessions s on s.conversation_id=c.id where c.id=p_conversation for update of c;
 if v_user is null then raise exception 'SUPPORT_NOT_FOUND'; end if;
 if length(trim(p_name)) not between 1 and 160 or length(p_notes)>2000 or length(p_whatsapp)>40 then raise exception 'SUPPORT_INVALID'; end if;
 insert into ofistant_customer_contacts(user_id,name,whatsapp,notes,updated_by) values(v_user,trim(p_name),p_whatsapp,p_notes,p_actor)
 on conflict(user_id) do update set name=excluded.name,whatsapp=excluded.whatsapp,notes=excluded.notes,updated_by=p_actor,updated_at=now();
 update ofistant_support_sessions set customer_name=trim(p_name) where conversation_id in(select id from ofistant_conversations where user_id=v_user);
end $$;
revoke all on function public.ofistant_contact_update(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.ofistant_contact_update(uuid,text,text,text,text) to service_role;
create or replace function public.ofistant_contact_name() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 new.customer_name=coalesce((select p.name from ofistant_customer_contacts p join ofistant_conversations c on c.user_id=p.user_id where c.id=new.conversation_id),new.customer_name);
 return new;
end $$;
drop trigger if exists ofistant_contact_name on public.ofistant_support_sessions;
create trigger ofistant_contact_name before insert on public.ofistant_support_sessions for each row execute function public.ofistant_contact_name();
create or replace function public.ofistant_support_command(
  p_user_id text, p_company_id text, p_staff boolean, p_name text,
  p_action text, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid; v_owner public.ofistant_conversations%rowtype;
  v_session public.ofistant_support_sessions%rowtype;
  v_messages jsonb; v_next bigint; v_after bigint; v_changed boolean := false;
  v_event text; v_role text; v_text text; v_message_id text;
begin
  if coalesce(p_user_id,'')='' or (not p_staff and coalesce(p_company_id,'')='') then raise exception 'SUPPORT_FORBIDDEN'; end if;
  if p_action='list' then
    if not p_staff then raise exception 'SUPPORT_FORBIDDEN'; end if;
    return jsonb_build_object('conversations',coalesce((
      select jsonb_agg(jsonb_build_object('id',conversation_id,'customerName',customer_name,'status',status,
        'staffId',staff_id,'staffName',staff_name,'updatedAt',updated_at) order by updated_at desc,conversation_id)
      from (select * from public.ofistant_support_sessions
        where status=coalesce(p_payload->>'status','waiting') order by updated_at desc,conversation_id
        limit 50 offset least(greatest(coalesce((p_payload->>'offset')::int,0),0),100000)) q
    ),'[]'::jsonb));
  end if;
  v_id := (p_payload->>'conversationId')::uuid;
  if p_action='start' and not p_staff then
    insert into public.ofistant_conversations(id,user_id,company_id,title)
      values(v_id,p_user_id,p_company_id,'Chat dengan tim Ofissio') on conflict do nothing;
  end if;
  select * into v_owner from public.ofistant_conversations where id=v_id for update;
  if not found then
    if p_action='read' and not p_staff then return jsonb_build_object('conversation',null,'messages','[]'::jsonb,'next',0,'more',false); end if;
    raise exception 'SUPPORT_NOT_FOUND';
  end if;
  if not p_staff and (v_owner.user_id<>p_user_id or v_owner.company_id<>p_company_id) then raise exception 'SUPPORT_NOT_FOUND'; end if;
  select * into v_session from public.ofistant_support_sessions where conversation_id=v_id;
  if p_action='start' and not p_staff and v_session.conversation_id is null then
    insert into public.ofistant_support_sessions(conversation_id,customer_name) values(v_id,left(p_name,160));
    -- Only server-persisted AI history is shared, and only after explicit handoff.
    insert into public.ofistant_support_messages(conversation_id,id,role,name,body,sent_at,is_context)
      select v_id,m->>'id',m->>'role',case when m->>'role'='user' then left(p_name,160) else 'Ofistant AI' end,
        m->>'text',to_timestamp((m->>'ts')::double precision/1000),true
      from public.ofistant_conversation_turns t cross join lateral jsonb_array_elements(t.messages) m
      where t.conversation_id=v_id order by t.sequence,(m->>'ts')::double precision;
    v_event := 'Permintaan diterima. Menunggu tim Ofissio. Anda dapat menambahkan pesan di sini.';
    v_changed := true;
  elsif p_action='start' and not p_staff and v_session.status='closed' then
    insert into public.ofistant_support_messages(conversation_id,id,role,name,body,sent_at,is_context)
      select v_id,m->>'id',m->>'role',case when m->>'role'='user' then left(p_name,160) else 'Ofistant AI' end,
        m->>'text',to_timestamp((m->>'ts')::double precision/1000),true
      from public.ofistant_conversation_turns t cross join lateral jsonb_array_elements(t.messages) m
      where t.conversation_id=v_id order by t.sequence,(m->>'ts')::double precision
      on conflict(conversation_id,id) do nothing;
    update public.ofistant_support_sessions set status='waiting',staff_id=null,staff_name=null where conversation_id=v_id;
    v_event := 'Percakapan dibuka kembali. Menunggu tim Ofissio.';
    v_changed := true;
  elsif p_action='claim' and p_staff then
    if v_session.status='closed' or v_session.conversation_id is null then raise exception 'SUPPORT_CLOSED'; end if;
    if v_session.staff_id is not null and v_session.staff_id<>p_user_id then raise exception 'SUPPORT_ASSIGNED'; end if;
    if v_session.status='waiting' then
      update public.ofistant_support_sessions set status='active',staff_id=p_user_id,staff_name=left(p_name,160) where conversation_id=v_id;
      v_event := left(p_name,160)||' dari tim Ofissio bergabung dalam percakapan.'; v_changed := true;
    end if;
  elsif p_action='send' then
    if v_session.conversation_id is null then raise exception 'SUPPORT_NOT_FOUND'; end if;
    v_message_id := (p_payload->>'messageId')::uuid::text;
    -- Retries are safe even if the session was closed after the original send.
    if not exists(select 1 from public.ofistant_support_messages where conversation_id=v_id and id=v_message_id) then
      if v_session.status='closed' then raise exception 'SUPPORT_CLOSED'; end if;
      if p_staff and (v_session.staff_id is distinct from p_user_id or v_session.status<>'active') then raise exception 'SUPPORT_ASSIGNED'; end if;
      v_text := trim(p_payload->>'text');
      if coalesce(length(v_text),0)<1 or length(v_text)>2000 then raise exception 'SUPPORT_INVALID'; end if;
      v_role := case when p_staff then 'staff' else 'user' end;
      if p_payload ? 'attachment' and not p_staff then raise exception 'SUPPORT_FORBIDDEN'; end if;
      insert into public.ofistant_support_messages(conversation_id,id,role,name,body,attachment)
        values(v_id,v_message_id,v_role,left(p_name,160),v_text,case when p_staff then p_payload->'attachment' else null end);
      v_changed := true;
    end if;
  elsif p_action='close' then
    if v_session.conversation_id is null then raise exception 'SUPPORT_NOT_FOUND'; end if;
    if p_staff and v_session.staff_id is distinct from p_user_id then raise exception 'SUPPORT_ASSIGNED'; end if;
    if v_session.status<>'closed' then
      update public.ofistant_support_sessions set status='closed' where conversation_id=v_id;
      v_event := 'Percakapan dengan tim Ofissio selesai. Anda dapat kembali bertanya kepada Ofistant AI.'; v_changed := true;
    end if;
  elsif p_action not in ('read','start') then raise exception 'SUPPORT_INVALID';
  end if;
  if v_event is not null then
    insert into public.ofistant_support_messages(conversation_id,id,role,name,body)
      values(v_id,gen_random_uuid()::text,'system','Ofissio',v_event);
  end if;
  if v_changed then
    update public.ofistant_support_sessions set updated_at=clock_timestamp() where conversation_id=v_id;
    update public.ofistant_conversations set updated_at=clock_timestamp() where id=v_id;
  end if;
  select * into v_session from public.ofistant_support_sessions where conversation_id=v_id;
  if v_session.conversation_id is null then
    if p_staff then raise exception 'SUPPORT_NOT_FOUND'; end if;
    return jsonb_build_object('conversation',null,'messages','[]'::jsonb,'next',0,'more',false);
  end if;
  v_after := greatest(coalesce((p_payload->>'after')::bigint,0),0);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'sequence',sequence,'role',role,'name',name,'text',body,
    'ts',floor(extract(epoch from sent_at)*1000),'context',is_context,'attachment',attachment) order by sequence),'[]'::jsonb),coalesce(max(sequence),v_after)
    into v_messages,v_next from (select * from public.ofistant_support_messages
      where conversation_id=v_id and sequence>v_after order by sequence limit 100) q;
  return jsonb_build_object('conversation',jsonb_build_object('id',v_id,'customerName',v_session.customer_name,
    'status',v_session.status,'staffId',v_session.staff_id,'staffName',v_session.staff_name,'updatedAt',v_session.updated_at),
    'messages',v_messages,'next',v_next,'more',exists(select 1 from public.ofistant_support_messages where conversation_id=v_id and sequence>v_next));
end $$;
revoke all on function public.ofistant_support_command(text,text,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ofistant_support_command(text,text,boolean,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
