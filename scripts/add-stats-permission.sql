-- 统计页面权限字段
-- 默认所有 TRAINER 只能看自己的统计数据；ADMIN 可以在统计页里勾选，
-- 授权某位教练查看全店（所有教练汇总）的统计数据。
-- ADMIN 本身不受这个字段影响，永远可以看全店。
--
-- 已于 2026-07-30 通过 Supabase MCP 直接执行到生产库（jbnhwtwnydbnfahtwysx），
-- 这里保留脚本文件用于记录 / 其他环境同步。

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_view_store_stats BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "user".can_view_store_stats IS '教练是否被 ADMIN 授权在统计页查看全店数据（默认 false，教练只能看自己）';
