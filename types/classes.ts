// Class Training Types - EXERCISE-CENTRIC ARCHITECTURE
export type ClassStatus = 'planned' | 'in_progress' | 'completed'
export type WeightUnit = 'kg' | 'lbs' | 'bodyweight'
export type DurationUnit = 'minutes' | 'seconds'
export type NoteAuthorType = 'trainer' | 'client'

// ===== MASTER EXERCISE RECORD =====
export interface MasterExercise {
  id: string
  nameEN: string // English name
  nameCN: string // Chinese name (中文名)
  description?: string
  instructions?: string

  // Media storage
  imageUrl?: string // Main reference image
  imageUrls?: string[] // Multiple reference images
  videoUrl?: string // Video/动图 support (future)

  // Creator & tracking
  createdBy: string // trainer user_id
  createdAt: string
  updatedAt: string
}

// ===== EXERCISE NOTES (visible history) =====
export interface ExerciseNote {
  id: string
  exerciseId: string
  authorId: string
  authorType: NoteAuthorType // 'trainer' or 'client'
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}

// ===== EXERCISE INSTANCE IN CLASS (can be modified) =====
export interface ClassExerciseInstance {
  id: string
  classId: string
  exerciseId: string // references MasterExercise
  masterExercise?: MasterExercise // populated when fetched

  // Instance-specific parameters (can differ from master)
  sets?: number
  reps?: number
  weight?: number
  weightUnit: WeightUnit
  duration?: number
  durationUnit: DurationUnit

  // Position in class
  order: number

  // Instance notes (for this specific use)
  instanceNotes?: string

  createdAt: string
  updatedAt: string
}

// ===== CLASS =====
export interface PilatesClass {
  id: string
  name: string
  date: string // ISO date
  duration: number // in minutes
  type: string // 'Pilates', 'Strength', 'Flexibility', etc.
  status: ClassStatus

  // Relationships
  createdBy: string // trainer user_id
  assignedTo: string // client user_id

  // Content
  exercises: ClassExerciseInstance[]
  notes?: string
  feedback?: string

  // Tracking
  createdAt: string
  updatedAt: string
}

// ===== CLASS COMPLETION =====
export interface ClassCompletion {
  id: string
  classId: string
  clientId: string
  completedAt: string
  clientNotes?: string
  trainerFeedback?: string
}

// ===== EXERCISE LIBRARY (what client sees for reuse) =====
export interface ExerciseLibraryItem extends MasterExercise {
  notesCount: number // How many notes on this exercise
  lastUsed?: string // When client last used it
  allNotes: ExerciseNote[] // Trainer + client notes (both visible)
}
