-- Penghitung pengunjung (termasuk tamu). Terpisah dari leaderboard: hanya ID acak per perangkat,
-- tanpa nama/EXP/data pribadi. Tabel tertutup untuk API; klien hanya bisa memanggil register_visit.
create table if not exists public.app_visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  visits     integer     not null default 1,
  is_member  boolean     not null default false
);
create index if not exists idx_app_visitors_last_seen on public.app_visitors (last_seen desc);

alter table public.app_visitors enable row level security;
revoke all on table public.app_visitors from public, anon, authenticated;

create or replace function public.register_visit(p_visitor_id uuid) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if p_visitor_id is null then return; end if;
  insert into public.app_visitors (visitor_id, is_member)
  values (p_visitor_id, auth.uid() is not null)
  on conflict (visitor_id) do update set
    last_seen = now(),
    visits    = public.app_visitors.visits + 1,
    is_member = public.app_visitors.is_member or (auth.uid() is not null)
  where public.app_visitors.last_seen < now() - interval '30 minutes'
     or (auth.uid() is not null and not public.app_visitors.is_member);
end
$fn$;

revoke all on function public.register_visit(uuid) from public;
grant execute on function public.register_visit(uuid) to anon, authenticated;
notify pgrst, 'reload schema';

-- Ringkasan (jalankan di SQL Editor):
-- select count(*) total, count(*) filter (where is_member) member, count(*) filter (where not is_member) tamu,
--        count(*) filter (where last_seen > now() - interval '1 day') aktif_24j,
--        count(*) filter (where last_seen > now() - interval '7 days') aktif_7h from public.app_visitors;
