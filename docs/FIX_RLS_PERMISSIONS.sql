-- FIX SCRIPT: Disable RLS on master_exercise table for API imports
-- Run this in Supabase SQL Editor

-- Drop all existing RLS policies on master_exercise
DROP POLICY IF EXISTS "Trainers can view all exercises" ON master_exercise;
DROP POLICY IF EXISTS "Trainers can create exercises" ON master_exercise;
DROP POLICY IF EXISTS "Trainers can update their exercises" ON master_exercise;

-- Disable RLS on master_exercise completely
ALTER TABLE master_exercise DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'master_exercise';
