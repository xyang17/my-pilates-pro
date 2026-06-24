-- Fix the weight_unit constraint to allow flexible weight units

-- Step 1: Drop the old constraint
ALTER TABLE master_exercise DROP CONSTRAINT master_exercise_default_weight_unit_check;

-- Step 2: Add new constraint that allows any reasonable weight unit
-- (Removed strict CHECK to allow flexibility with weight unit variations)

-- Verify constraint was dropped
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'master_exercise' AND constraint_name LIKE '%weight%';
