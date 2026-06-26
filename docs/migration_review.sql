-- Migration: Add post-class review fields
-- Run this in Supabase > SQL Editor

-- 1. Add class_type to class table (private vs group)
ALTER TABLE class
  ADD COLUMN IF NOT EXISTS class_type TEXT NOT NULL DEFAULT 'private'
    CHECK (class_type IN ('private', 'group')),
  ADD COLUMN IF NOT EXISTS post_summary TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add actual performance + post_note to class_exercise_instance
ALTER TABLE class_exercise_instance
  ADD COLUMN IF NOT EXISTS actual_sets    INTEGER,
  ADD COLUMN IF NOT EXISTS actual_reps    INTEGER,
  ADD COLUMN IF NOT EXISTS actual_weight  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS post_note      TEXT;

-- 3. New table: student personal notes on group class exercises
CREATE TABLE IF NOT EXISTS student_exercise_note (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id             UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  exercise_instance_id UUID NOT NULL REFERENCES class_exercise_instance(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name         TEXT,
  content              TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);

-- Index for fast lookups by class
CREATE INDEX IF NOT EXISTS idx_student_exercise_note_class_id
  ON student_exercise_note(class_id);

CREATE INDEX IF NOT EXISTS idx_student_exercise_note_student_id
  ON student_exercise_note(student_id);
