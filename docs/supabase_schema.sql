-- Supabase SQL Schema for MyPilatesPro Class Training System
-- Run this in your Supabase SQL Editor

-- ===== DROP EXISTING TABLES (if any) =====
DROP TABLE IF EXISTS class_completion CASCADE;
DROP TABLE IF EXISTS class_exercise_instance CASCADE;
DROP TABLE IF EXISTS class CASCADE;
DROP TABLE IF EXISTS exercise_note CASCADE;
DROP TABLE IF EXISTS exercise_image CASCADE;
DROP TABLE IF EXISTS master_exercise CASCADE;
DROP TABLE IF EXISTS user_language_preference CASCADE;

-- ===== TABLES =====

-- 1. Master Exercise Table (ONE exercise with bilingual content)
CREATE TABLE master_exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bilingual Names & Descriptions
  name_en VARCHAR(255) NOT NULL,
  name_cn VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_cn TEXT,
  instructions_en TEXT,
  instructions_cn TEXT,

  -- Bilingual Exercise Type & Difficulty
  type_en VARCHAR(100), -- 'Pilates Reformer', 'Pilates Mat', 'Fitness', 'Stretching', etc.
  type_cn VARCHAR(100), -- Chinese translation: '普拉提改革机', '普拉提垫上', etc.
  difficulty_en VARCHAR(50), -- 'Beginner', 'Intermediate', 'Advanced'
  difficulty_cn VARCHAR(50), -- Chinese translation: '初级', '中级', '高级'
  target_muscles_en VARCHAR(500), -- Comma-separated: 'Core,Glutes,Hamstrings'
  target_muscles_cn VARCHAR(500), -- Chinese translation: '核心,臀肌,腘绳肌'

  -- Universal Properties (NOT translated - anatomical/numerical)
  featured_image_url VARCHAR(1000),

  -- Default parameters (can be overridden per class)
  default_sets INTEGER,
  default_reps INTEGER,
  default_weight DECIMAL(10, 2),
  default_weight_unit VARCHAR(20) DEFAULT 'kg' CHECK (default_weight_unit IN ('kg', 'lbs', 'bodyweight')),
  default_duration INTEGER,
  default_duration_unit VARCHAR(20) DEFAULT 'minutes' CHECK (default_duration_unit IN ('minutes', 'seconds')),

  -- Metadata
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.5. Exercise Image Table (Multiple images per exercise)
CREATE TABLE exercise_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES master_exercise(id) ON DELETE CASCADE,
  image_url VARCHAR(1000) NOT NULL,
  caption TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exercise Notes Table (Trainer + Client notes on exercises)
CREATE TABLE exercise_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES master_exercise(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('trainer', 'client')),
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 3. Class Table (Training sessions)
CREATE TABLE class (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  duration INTEGER DEFAULT 60, -- minutes
  type VARCHAR(100), -- 'Pilates', 'Reformer', 'Strength', etc.
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_by UUID NOT NULL, -- Trainer or client who created
  assigned_to UUID, -- Client this class is assigned to (null if self-training)
  notes TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Class Exercise Instance Table (Exercises used in a specific class)
CREATE TABLE class_exercise_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES master_exercise(id),
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(20) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs', 'bodyweight')),
  duration INTEGER,
  duration_unit VARCHAR(20) DEFAULT 'minutes' CHECK (duration_unit IN ('minutes', 'seconds')),
  "order" INTEGER NOT NULL, -- Position in class
  instance_notes TEXT, -- Notes specific to this use in this class
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Class Completion Table (Track when client completes a class)
CREATE TABLE class_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  client_notes TEXT,
  trainer_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5.5. User Language Preference Table
CREATE TABLE user_language_preference (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'zh', 'es', 'fr')), -- English, Chinese, Spanish, French (expandable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===== INDEXES =====

CREATE INDEX idx_master_exercise_created_by ON master_exercise(created_by);
CREATE INDEX idx_exercise_image_exercise_id ON exercise_image(exercise_id);
CREATE INDEX idx_exercise_note_exercise_id ON exercise_note(exercise_id);
CREATE INDEX idx_exercise_note_author_id ON exercise_note(author_id);
CREATE INDEX idx_class_created_by ON class(created_by);
CREATE INDEX idx_class_assigned_to ON class(assigned_to);
CREATE INDEX idx_class_date ON class(date);
CREATE INDEX idx_class_exercise_instance_class_id ON class_exercise_instance(class_id);
CREATE INDEX idx_class_exercise_instance_exercise_id ON class_exercise_instance(exercise_id);
CREATE INDEX idx_class_completion_class_id ON class_completion(class_id);
CREATE INDEX idx_class_completion_client_id ON class_completion(client_id);

-- ===== ROW LEVEL SECURITY (RLS) =====

-- EXPLICITLY DISABLE RLS on master_exercise to allow API imports
ALTER TABLE master_exercise DISABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables
ALTER TABLE exercise_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE class ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_exercise_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_completion ENABLE ROW LEVEL SECURITY;

-- Master Exercise Policies (DISABLED - allowing full API access for imports)
-- Note: RLS disabled on master_exercise to allow bulk imports via service role API
-- Can be re-enabled later with proper policies if needed

-- Exercise Image Policies
CREATE POLICY "Anyone can view exercise images" ON exercise_image
  FOR SELECT USING (true);

CREATE POLICY "Users can manage images for their exercises" ON exercise_image
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_exercise WHERE master_exercise.id = exercise_image.exercise_id
      AND master_exercise.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their exercises" ON exercise_image
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM master_exercise WHERE master_exercise.id = exercise_image.exercise_id
      AND master_exercise.created_by = auth.uid()
    )
  );

-- Exercise Note Policies
CREATE POLICY "Anyone can view exercise notes" ON exercise_note
  FOR SELECT USING (true);

CREATE POLICY "Users can create notes" ON exercise_note
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Class Policies
CREATE POLICY "Users can view classes assigned to them or created by them" ON class
  FOR SELECT USING (
    auth.uid() = created_by OR auth.uid() = assigned_to
  );

CREATE POLICY "Users can create classes" ON class
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update classes they created" ON class
  FOR UPDATE USING (auth.uid() = created_by);

-- Class Exercise Instance Policies
CREATE POLICY "Users can view exercises in classes they can access" ON class_exercise_instance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class WHERE class.id = class_exercise_instance.class_id
      AND (class.created_by = auth.uid() OR class.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can manage exercises in classes they created" ON class_exercise_instance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM class WHERE class.id = class_exercise_instance.class_id
      AND class.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update exercises in classes they created" ON class_exercise_instance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM class WHERE class.id = class_exercise_instance.class_id
      AND class.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete exercises from classes they created" ON class_exercise_instance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM class WHERE class.id = class_exercise_instance.class_id
      AND class.created_by = auth.uid()
    )
  );

-- Class Completion Policies
CREATE POLICY "Users can view their own completions" ON class_completion
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create completion records" ON class_completion
  FOR INSERT WITH CHECK (auth.uid() = client_id);
