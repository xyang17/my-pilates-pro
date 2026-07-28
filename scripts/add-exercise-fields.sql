-- ============================================================
-- 给 master_exercise 新增 5 组字段（10 列），用于普拉提教学场景
-- 生成时间: 2026-07-25
-- 在 Supabase SQL Editor 里运行一次即可
-- ============================================================

ALTER TABLE master_exercise
  ADD COLUMN IF NOT EXISTS body_position_en        VARCHAR(100),   -- 体位：Supine/Prone/Side-lying/Standing/Seated/Kneeling
  ADD COLUMN IF NOT EXISTS body_position_cn         VARCHAR(100),   -- 体位：仰卧/俯卧/侧卧/站立/坐姿/跪姿
  ADD COLUMN IF NOT EXISTS equipment_setup_en       VARCHAR(255),   -- 器械配置：如 "2 red springs" / "Long box + strap"
  ADD COLUMN IF NOT EXISTS equipment_setup_cn       VARCHAR(255),   -- 器械配置：如 "2根红色弹簧" / "长箱+绑带"
  ADD COLUMN IF NOT EXISTS contraindications_en     TEXT,           -- 禁忌/慎用人群：如 "Avoid during pregnancy, herniated disc"
  ADD COLUMN IF NOT EXISTS contraindications_cn     TEXT,           -- 禁忌/慎用人群：如 "孕期慎做、腰椎间盘突出禁做"
  ADD COLUMN IF NOT EXISTS cues_en                  TEXT,           -- 教学口令提示：如 "Imagine zipping up from pubic bone to ribs"
  ADD COLUMN IF NOT EXISTS cues_cn                  TEXT,           -- 教学口令提示：如 "想象从耻骨向肋骨拉拉链"
  ADD COLUMN IF NOT EXISTS secondary_muscles_en     VARCHAR(500),   -- 次要发力肌群（逗号分隔）：如 "Shoulders, Triceps"
  ADD COLUMN IF NOT EXISTS secondary_muscles_cn     VARCHAR(500);   -- 次要发力肌群（逗号分隔）：如 "肩部, 肱三头肌"

-- 验证
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'master_exercise' ORDER BY ordinal_position;
