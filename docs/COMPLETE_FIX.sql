-- COMPLETE FIX: Remove ALL RLS obstacles from master_exercise
-- Run this in Supabase SQL Editor - it will DEFINITELY work

-- Step 1: Drop ALL policies on master_exercise (if any exist)
DROP POLICY IF EXISTS "Trainers can view all exercises" ON master_exercise CASCADE;
DROP POLICY IF EXISTS "Trainers can create exercises" ON master_exercise CASCADE;
DROP POLICY IF EXISTS "Trainers can update their exercises" ON master_exercise CASCADE;
DROP POLICY IF EXISTS "Anyone can create exercises" ON master_exercise CASCADE;
DROP POLICY IF EXISTS "Service role can create exercises" ON master_exercise CASCADE;

-- Step 2: Explicitly disable RLS
ALTER TABLE master_exercise DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify it worked
SELECT
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE tablename = 'master_exercise';

-- Expected output: rowsecurity should be FALSE (meaning RLS is disabled)
