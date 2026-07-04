-- Personal Recipe Website: initial schema
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run

-- === recipes table ===
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  source_link text check (char_length(source_link) <= 2048),
  photo_path text,
  ingredients jsonb not null default '[]'::jsonb,
  method text not null default '' check (char_length(method) <= 10000),
  time_to_cook_minutes integer check (time_to_cook_minutes between 1 and 1440),
  servings integer check (servings between 1 and 100),
  rating integer check (rating between 1 and 5),
  cost_per_portion numeric(6,2) check (cost_per_portion >= 0 and cost_per_portion <= 9999.99),
  cook_notes text not null default '' check (char_length(cook_notes) <= 5000),
  calories_per_serving numeric check (calories_per_serving >= 0),
  protein_per_serving numeric check (protein_per_serving >= 0),
  dietary_labels text[] not null default '{}',
  key_ingredient_labels text[] not null default '{}',
  filter_categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_owner_id_idx on public.recipes(owner_id);

alter table public.recipes enable row level security;

drop policy if exists "Owner can manage own recipes" on public.recipes;
create policy "Owner can manage own recipes"
  on public.recipes
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- === pantry_exclusions table ===
create table if not exists public.pantry_exclusions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry text not null check (char_length(entry) between 1 and 100)
);

create unique index if not exists pantry_exclusions_owner_entry_unique
  on public.pantry_exclusions (owner_id, lower(trim(entry)));

alter table public.pantry_exclusions enable row level security;

drop policy if exists "Owner can manage own pantry exclusions" on public.pantry_exclusions;
create policy "Owner can manage own pantry exclusions"
  on public.pantry_exclusions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
