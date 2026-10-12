-- 课时包支持小数扣课（1.5 小时 = 扣 1.5 节）
-- 在 Supabase → SQL Editor 里整段粘贴，点 Run。可以重复执行。

drop view if exists package_balance;

alter table session_package
  alter column total_sessions type numeric(7,2) using total_sessions::numeric,
  alter column bonus_sessions type numeric(7,2) using bonus_sessions::numeric;

alter table class add column if not exists package_units numeric(4,2)
  check (package_units is null or (package_units > 0 and package_units <= 10));
comment on column class.package_units is '这节课从课时包扣几节（1.5 小时 = 1.5）。null = 1';

create view package_balance as
select p.id, p.client_id, p.created_by,
  p.total_sessions::float8 as total_sessions, p.bonus_sessions::float8 as bonus_sessions,
  p.price, p.source, p.purchased_at, p.expires_at, p.status, p.notes, p.created_at, p.updated_at,
  coalesce(u.used, 0)::float8 as used_sessions,
  (p.total_sessions + p.bonus_sessions)::float8 as granted_sessions,
  (p.total_sessions + p.bonus_sessions - coalesce(u.used, 0))::float8 as remaining_sessions,
  (p.expires_at is not null and p.expires_at < current_date) as is_expired,
  (p.total_sessions + p.bonus_sessions - coalesce(u.used, 0)) <= 0 as is_used_up,
  case when (p.total_sessions + p.bonus_sessions) > 0
       then coalesce(p.price, 0) / (p.total_sessions + p.bonus_sessions) else 0 end as price_per_session
from session_package p
left join (
  select package_id, sum(coalesce(package_units, 1)) as used
  from class
  where package_id is not null and status = 'completed' and class_type <> 'self_practice'
  group by package_id
) u on u.package_id = p.id;

revoke all on package_balance from anon, authenticated;
grant all on package_balance to service_role;

-- 执行完应该看到 Taru 的包：10 / 1 / 9
select granted_sessions, used_sessions, remaining_sessions
from package_balance where id = '373d3d65-c1fe-49c8-8895-6aa16e33f67a';
