-- 2026-10-08 · 学员单独的满赠规则（已在线上库执行）
-- loyalty_mode: null/'default' 跟随全店默认；'custom' 用下面两个数；'off' 不参加累计满赠
-- 规则解析见 lib/loyaltyRule.ts
alter table public."user"
  add column if not exists loyalty_mode text,
  add column if not exists loyalty_threshold integer,
  add column if not exists loyalty_bonus integer;
alter table public."user" add constraint user_loyalty_mode_check check (loyalty_mode is null or loyalty_mode in ('default','custom','off'));
alter table public."user" add constraint user_loyalty_threshold_check check (loyalty_threshold is null or loyalty_threshold > 0);
alter table public."user" add constraint user_loyalty_bonus_check check (loyalty_bonus is null or loyalty_bonus > 0);
