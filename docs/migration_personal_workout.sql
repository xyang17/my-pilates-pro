-- 教练个人训练记录（2026-10-03）
-- 见 docs/交接-导航重构与个人训练.md 第四节。
-- 与 class 系统平行但独立：教练自己的训练不是"一节课"，没有学员、没有收入、不需要复盘。
-- 学员的自我练习维持现状，继续存在 class 表（class_type='self_practice'），不迁移。
--
-- 访问方式：只走 API（service role）。RLS 打开但不加任何策略 = anon key 一律读不到写不了。

create table if not exists public.personal_workout (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public."user"(id) on delete cascade,
  date         date not null,
  title        text,
  type         text not null default 'other'
               check (type in ('strength', 'pilates', 'other')),
  duration_min integer check (duration_min is null or duration_min >= 0),
  notes        text,
  source       text not null default 'manual'
               check (source in ('manual', 'timer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists personal_workout_user_date_idx
  on public.personal_workout (user_id, date desc);

create table if not exists public.personal_workout_exercise (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.personal_workout(id) on delete cascade,
  -- 可空：为空表示自由填写。动作库那条被删掉也不连带删记录，只是断开关联
  exercise_id  uuid references public.master_exercise(id) on delete set null,
  -- 冗余存一份名字，动作库改名/删除都不影响历史记录的显示
  name         text not null,
  sets         integer check (sets is null or sets >= 0),
  reps         integer check (reps is null or reps >= 0),
  weight       numeric check (weight is null or weight >= 0),
  weight_unit  text default 'kg',
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  rest_sec     integer check (rest_sec is null or rest_sec >= 0),
  notes        text,
  order_num    integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists personal_workout_exercise_workout_idx
  on public.personal_workout_exercise (workout_id, order_num);
-- 以后做单个动作趋势图要按动作查
create index if not exists personal_workout_exercise_exercise_idx
  on public.personal_workout_exercise (exercise_id) where exercise_id is not null;

alter table public.personal_workout enable row level security;
alter table public.personal_workout_exercise enable row level security;
