
-- Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('admin', 'citizen');
create type public.alert_type as enum ('water', 'electricity', 'general');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.bill_status as enum ('unpaid', 'paid', 'overdue');
create type public.utility_kind as enum ('water', 'electricity');
create type public.complaint_status as enum ('open', 'in_progress', 'resolved');
create type public.chat_role as enum ('user', 'assistant');

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  ward text,
  water_consumer_id text,
  electricity_consumer_id text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + default citizen role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.phone);
  insert into public.user_roles (user_id, role) values (new.id, 'citizen');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  summary text,
  type alert_type not null,
  severity alert_severity not null default 'info',
  ward text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.alerts to authenticated, anon;
grant insert, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "Anyone reads alerts" on public.alerts for select using (true);
create policy "Admins manage alerts" on public.alerts for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger trg_alerts_updated before update on public.alerts for each row execute function public.set_updated_at();
create index alerts_starts_at_idx on public.alerts (starts_at desc);
create index alerts_ward_idx on public.alerts (ward);

-- Bills
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind utility_kind not null,
  consumer_id text not null,
  period_label text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  status bill_status not null default 'unpaid',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.bills to authenticated;
grant all on public.bills to service_role;
alter table public.bills enable row level security;
create policy "Users read own bills" on public.bills for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Users update own bills" on public.bills for update to authenticated using (user_id = auth.uid());
create policy "Admins insert bills" on public.bills for insert to authenticated with check (public.has_role(auth.uid(),'admin') or user_id = auth.uid());
create index bills_user_idx on public.bills (user_id);

-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null default 'mock',
  reference text not null default ('PAY-' || substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  status text not null default 'success',
  created_at timestamptz not null default now()
);
grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Users read own payments" on public.payments for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Users insert own payments" on public.payments for insert to authenticated with check (user_id = auth.uid());

-- Complaints
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  subject text not null,
  message text not null,
  ward text,
  status complaint_status not null default 'open',
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;
create policy "Users read own complaints" on public.complaints for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Users insert own complaints" on public.complaints for insert to authenticated with check (user_id = auth.uid());
create policy "Admins update complaints" on public.complaints for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_complaints_updated before update on public.complaints for each row execute function public.set_updated_at();

-- Chat threads + messages
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;
create policy "Users manage own threads" on public.chat_threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger trg_chat_threads_updated before update on public.chat_threads for each row execute function public.set_updated_at();

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role chat_role not null,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "Users read own chat messages" on public.chat_messages for select to authenticated using (user_id = auth.uid());
create policy "Users insert own chat messages" on public.chat_messages for insert to authenticated with check (user_id = auth.uid());
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- Knowledge base for RAG (1536 dims for text-embedding-3-small)
create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  title text,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.kb_chunks to authenticated;
grant all on public.kb_chunks to service_role;
alter table public.kb_chunks enable row level security;
create policy "Anyone reads kb" on public.kb_chunks for select to authenticated using (true);
create index kb_chunks_embedding_idx on public.kb_chunks using hnsw (embedding vector_cosine_ops);

create or replace function public.match_kb_chunks(query_embedding vector(1536), match_count int default 5)
returns table (id uuid, source_type text, title text, content text, similarity float)
language sql stable as $$
  select k.id, k.source_type, k.title, k.content, 1 - (k.embedding <=> query_embedding) as similarity
  from public.kb_chunks k
  where k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count
$$;
