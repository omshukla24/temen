-- Accounts: one profile per user and the cores they sync. Every row is
-- readable and writable only by its owner (row-level security).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

create table public.cores (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  place_name text check (char_length(place_name) <= 200),
  nickname text check (char_length(nickname) <= 80),
  headline text check (char_length(headline) <= 200),
  report jsonb not null default '{}'::jsonb,
  saved boolean not null default false,
  note text check (char_length(note) <= 4000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index cores_user_updated_idx on public.cores (user_id, updated_at desc);
create index cores_user_saved_idx on public.cores (user_id) where saved;

revoke all on public.profiles, public.cores from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.cores to authenticated;
grant all on public.profiles, public.cores to service_role;

alter table public.profiles enable row level security;
alter table public.cores enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "cores read own" on public.cores for select to authenticated using ((select auth.uid()) = user_id);
create policy "cores insert own" on public.cores for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cores update own" on public.cores for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cores delete own" on public.cores for delete to authenticated using ((select auth.uid()) = user_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger cores_set_updated_at before update on public.cores for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name',
                                new.raw_user_meta_data ->> 'full_name',
                                new.raw_user_meta_data ->> 'name'), 80))
  on conflict (id) do nothing;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
