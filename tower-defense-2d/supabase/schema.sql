-- ==========================================
-- Tower Defense 2D - Supabase Database Schema
-- ==========================================

-- 1. TABELA PROFILES (Perfis dos Jogadores)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_id text not null default 'default_avatar',
  created_at timestamptz not null default now()
);

-- Habilitar RLS em profiles
alter table public.profiles enable row level security;

-- Politicas RLS para profiles
create policy "Perfis sao publicos para leitura"
  on public.profiles
  for select
  using (true);

create policy "Usuarios podem inserir seu proprio perfil"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Usuarios podem atualizar seu proprio perfil"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- 2. TABELA PLAYER_STATE (Talentos e Moeda Global)
create table if not exists public.player_state (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  stars integer not null default 0 check (stars >= 0),
  talent_damage_lvl integer not null default 0 check (talent_damage_lvl >= 0),
  talent_gold_lvl integer not null default 0 check (talent_gold_lvl >= 0),
  talent_hp_lvl integer not null default 0 check (talent_hp_lvl >= 0),
  talent_cd_lvl integer not null default 0 check (talent_cd_lvl >= 0),
  talent_repair_lvl integer not null default 0 check (talent_repair_lvl >= 0),
  talent_crit_lvl integer not null default 0 check (talent_crit_lvl >= 0),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS em player_state
alter table public.player_state enable row level security;

-- Politicas RLS para player_state
create policy "Usuarios podem ler seu proprio estado"
  on public.player_state
  for select
  using (auth.uid() = player_id);

create policy "Usuarios podem inserir seu proprio estado"
  on public.player_state
  for insert
  with check (auth.uid() = player_id);

create policy "Usuarios podem atualizar seu proprio estado"
  on public.player_state
  for update
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);


-- 3. TABELA PLAYER_ACHIEVEMENTS (Progresso das Conquistas)
create table if not exists public.player_achievements (
  player_id uuid references public.profiles(id) on delete cascade,
  achievement_id text not null,
  progress integer not null default 0 check (progress >= 0),
  unlocked_at timestamptz default null,
  updated_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

-- Habilitar RLS em player_achievements
alter table public.player_achievements enable row level security;

-- Politicas RLS para player_achievements
create policy "Usuarios podem ler suas proprias conquistas"
  on public.player_achievements
  for select
  using (auth.uid() = player_id);

create policy "Usuarios podem registrar suas proprias conquistas"
  on public.player_achievements
  for insert
  with check (auth.uid() = player_id);

create policy "Usuarios podem atualizar suas proprias conquistas"
  on public.player_achievements
  for update
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);


-- 4. TABELA RUNS (Historico de Partidas e Leaderboard)
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  map_id text not null,
  challenge_mode text not null,
  wave_reached integer not null default 0 check (wave_reached >= 0),
  gold_earned integer not null default 0 check (gold_earned >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  created_at timestamptz not null default now()
);

-- Habilitar RLS em runs
alter table public.runs enable row level security;

-- Politicas RLS para runs
create policy "Pontuacoes de partidas sao publicas"
  on public.runs
  for select
  using (true);

create policy "Usuarios podem inserir suas proprias partidas"
  on public.runs
  for insert
  with check (auth.uid() = player_id);


-- 5. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL E ESTADO AO REGISTRAR NO AUTH
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Player_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'avatar_id', 'default_avatar')
  )
  on conflict (id) do update set
    username = excluded.username,
    avatar_id = excluded.avatar_id;

  insert into public.player_state (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$;

-- Vincular trigger ao auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 6. VIEW TOP 20 LEADERBOARD (Melhores Pontuações Únicas por Jogador)
create or replace view public.top_20_leaderboard
with (security_invoker = true) as
with best_runs as (
  select
    r.player_id,
    r.wave_reached,
    r.gold_earned,
    r.total_kills,
    r.map_id,
    r.challenge_mode,
    r.created_at,
    row_number() over (
      partition by r.player_id
      order by r.wave_reached desc, r.total_kills desc, r.created_at asc
    ) as rank_per_player
  from public.runs r
)
select
  p.username,
  p.avatar_id,
  br.wave_reached,
  br.gold_earned,
  br.total_kills,
  br.map_id,
  br.challenge_mode,
  br.created_at
from best_runs br
join public.profiles p on p.id = br.player_id
where br.rank_per_player = 1
order by br.wave_reached desc, br.total_kills desc, br.created_at asc
limit 20;
