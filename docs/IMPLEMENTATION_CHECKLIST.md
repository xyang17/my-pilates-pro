# Bilingual Exercise System - Implementation Checklist

## 🚨 Current Status: PARTIALLY DEPLOYED

✅ **Done:**
- Database schema defined (supabase_schema.sql)
- Excel files updated with bilingual columns
- Exercise ID system designed
- Muscle translation complete

❌ **Not Done:**
- Schema NOT applied to live Supabase database
- API endpoints using WRONG field names (singular instead of bilingual)
- Dashboard not showing bilingual content
- Language preference system NOT integrated
- No language-specific content delivery

---

## 📋 STEP-BY-STEP ACTION PLAN

### PHASE 1: DATABASE (5 minutes) ⚠️ DO THIS FIRST!

#### Step 1.1: Apply Schema to Supabase ✅ **CRITICAL**
```
Location: /Users/jessica/my-pilates-pro/docs/supabase_schema.sql

Action:
1. Go to https://supabase.com → Your Project → SQL Editor
2. Create new query
3. Copy entire contents of supabase_schema.sql
4. Paste into SQL Editor
5. Click "Run"
6. Wait for confirmation ✅

IMPORTANT: This will recreate the tables with correct column names!
(You may lose data if exercises already exist - backup first if needed)
```

**After this runs, you'll have:**
- ✅ `master_exercise` table with: name_en, name_cn, description_en, description_cn, instructions_en, instructions_cn, type_en, type_cn, difficulty_en, difficulty_cn, target_muscles_en, target_muscles_cn
- ✅ `user_language_preference` table
- ✅ All proper indexes and RLS policies

---

### PHASE 2: API ENDPOINTS (15 minutes)

#### Step 2.1: Update Exercise Queries
**Files to update:**
- `app/api/exercises/route.ts` (GET/POST)
- `app/api/exercises/[id]/route.ts` (GET/PUT/DELETE)
- `app/api/exercises/import/route.ts` (POST for Excel import)

**What changes:**
```typescript
// BEFORE (Wrong)
const exercise = await supabase
  .from('master_exercise')
  .select('name_en, name_cn, description, instructions')

// AFTER (Correct)
const exercise = await supabase
  .from('master_exercise')
  .select(`
    id, 
    name_en, name_cn,
    description_en, description_cn,
    instructions_en, instructions_cn,
    type_en, type_cn,
    difficulty_en, difficulty_cn,
    target_muscles_en, target_muscles_cn,
    default_sets, default_reps, default_weight,
    featured_image_url,
    created_by, is_active, created_at, updated_at
  `)
```

#### Step 2.2: Add Language-Aware Response Logic
```typescript
// NEW: Get user's language preference
const userLanguage = await supabase
  .from('user_language_preference')
  .select('language')
  .eq('user_id', userId)
  .single()

// NEW: Return language-specific content
const language = userLanguage?.language || 'en'
return {
  id: exercise.id,
  name: language === 'zh' ? exercise.name_cn : exercise.name_en,
  description: language === 'zh' ? exercise.description_cn : exercise.description_en,
  instructions: language === 'zh' ? exercise.instructions_cn : exercise.instructions_en,
  type: language === 'zh' ? exercise.type_cn : exercise.type_en,
  difficulty: language === 'zh' ? exercise.difficulty_cn : exercise.difficulty_en,
  targetMuscles: language === 'zh' ? exercise.target_muscles_cn : exercise.target_muscles_en,
  ...
}
```

#### Step 2.3: Create Language Preference Endpoints
**New file:** `app/api/user/language-preference/route.ts`

```typescript
// GET current preference
GET /api/user/language-preference
→ Returns: { language: 'en' | 'zh' }

// SET preference
PUT /api/user/language-preference
Body: { language: 'en' | 'zh' }
→ Updates user_language_preference table
```

#### Step 2.4: Update Exercise Import Handler
**File:** `app/api/exercises/import/route.ts`

**Changes:**
```typescript
// BEFORE: Expects single description, instructions
const exercise = {
  nameEN: row.nameEN,
  nameCN: row.nameCN,
  description: row.description, ❌ WRONG
  instructions: row.instructions, ❌ WRONG
  type: row.type, ❌ WRONG
}

// AFTER: Expects bilingual columns
const exercise = {
  id: row.exerciseId || null, // Can be empty (auto-generate) or UUID
  name_en: row.nameEN,
  name_cn: row.nameCN,
  description_en: row.descriptionEN, ✅ CORRECT
  description_cn: row.descriptionCN,
  instructions_en: row.instructionsEN,
  instructions_cn: row.instructionsCN,
  type_en: row.typeEN,
  type_cn: row.typeCN,
  difficulty_en: row.difficultyEN,
  difficulty_cn: row.difficultyCN,
  target_muscles_en: row.targetMusclesEN,
  target_muscles_cn: row.targetMusclesCN,
  ...
}
```

---

### PHASE 3: DASHBOARD UI (10 minutes)

#### Step 3.1: Update Exercise Display
**File:** `app/dashboard/exercises/page.tsx`

**Add new fields to card:**
```
Exercise Name (EN/CN)
Type: Pilates Mat / 普拉提垫上
Difficulty: Intermediate / 中级
Target Muscles: Core, Chest, Arms / 核心, 胸部, 手臂
Description: ...
```

#### Step 3.2: Respect User Language Preference
```typescript
// On page load: Get user's language preference
const userLanguage = await fetch('/api/user/language-preference')

// When displaying: Show based on preference
<h3>{language === 'zh' ? exercise.name_cn : exercise.name_en}</h3>
<p>{language === 'zh' ? exercise.description_cn : exercise.description_en}</p>
```

#### Step 3.3: Add Language Toggle (Optional)
**For bilingual trainers:**
```
[🇬🇧 English] [中文 Chinese] Toggle Button
→ When clicked: Updates language preference
→ Page refreshes with other language
```

---

### PHASE 4: CLIENT PROFILE (5 minutes)

#### Step 4.1: Add Language Selection to Client Setup
**File:** `app/dashboard/clients/new/page.tsx` or equivalent

**New form field:**
```
Preferred Language:
  ☐ English (en)
  ☐ 中文 (zh)
  Default: English
```

**On save:**
```typescript
// Create/update user_language_preference
await supabase
  .from('user_language_preference')
  .upsert({
    user_id: clientId,
    language: selectedLanguage
  })
```

---

## 🎯 WHAT YOU NEED TO DO

### Immediate (Required for import to work):

1. **Run the SQL schema** in Supabase SQL Editor
   - Copy: `/Users/jessica/my-pilates-pro/docs/supabase_schema.sql`
   - Paste into Supabase
   - Click Run
   - ✅ Done - database now ready for bilingual data

2. **Tell me to update the API endpoints**
   - I'll modify all API routes to use correct field names
   - I'll add language preference logic
   - I'll create the language preference endpoints

### Next Steps (After API is updated):

3. **Update dashboard** - I'll update the exercise display
4. **Add client language preference** - I'll add UI for language selection
5. **Test the system** - We verify end-to-end

---

## 📝 Current API Field Mismatch (What's Wrong Now)

### Database expects (after schema applied):
```
name_en, name_cn
description_en, description_cn  ← BILINGUAL (NOT "description")
instructions_en, instructions_cn ← BILINGUAL (NOT "instructions")
type_en, type_cn ← BILINGUAL (NOT "type")
difficulty_en, difficulty_cn ← BILINGUAL (NOT "difficulty")
target_muscles_en, target_muscles_cn ← BILINGUAL (NOT "target_muscles")
```

### API currently sends:
```
name_en, name_cn ✅
description ❌ (should be description_en/description_cn)
instructions ❌ (should be instructions_en/instructions_cn)
type ❌ (should be type_en/type_cn)
difficulty ❌ (should be difficulty_en/difficulty_cn)
targetMuscles ❌ (should be target_muscles_en/target_muscles_cn)
```

---

## 🚀 Timeline

| Phase | Time | Status |
|-------|------|--------|
| **1. Apply Schema** | 5 min | 🔴 DO THIS FIRST |
| **2. Update API** | 15 min | ⏳ I can do this |
| **3. Update Dashboard** | 10 min | ⏳ I can do this |
| **4. Add Language UI** | 5 min | ⏳ I can do this |
| **5. Test & Verify** | 10 min | 🟡 We do together |
| **TOTAL** | ~45 min | ✅ Full system ready! |

---

## ✅ FINAL RESULT

After all steps:
- ✅ Database stores bilingual exercises
- ✅ API returns language-specific content
- ✅ Dashboard respects user language preference
- ✅ Trainers see Chinese/English based on setting
- ✅ Clients see exercises in their preferred language
- ✅ Import system handles all bilingual columns
- ✅ Exercise IDs prevent duplication

---

## 🎬 READY TO START?

**NEXT ACTION (for you):**
1. Go to Supabase → SQL Editor
2. Copy entire `supabase_schema.sql`
3. Paste and Run
4. Come back and say "✅ Schema applied"

**Then I'll:**
1. Update all API endpoints
2. Update dashboard display
3. Add language preference system
4. Create test import to verify

---

**You're 1 step away from a professional bilingual system!** 💪

