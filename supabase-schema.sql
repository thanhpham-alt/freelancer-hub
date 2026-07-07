create table if not exists public.app_records (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists app_records_collection_idx
  on public.app_records (collection);

alter table public.app_records enable row level security;

drop policy if exists "Allow public reads" on public.app_records;
create policy "Allow public reads"
  on public.app_records
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow public inserts" on public.app_records;
create policy "Allow public inserts"
  on public.app_records
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow public updates" on public.app_records;
create policy "Allow public updates"
  on public.app_records
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public deletes" on public.app_records;
create policy "Allow public deletes"
  on public.app_records
  for delete
  to anon, authenticated
  using (true);
