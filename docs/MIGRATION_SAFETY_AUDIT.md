# Migration Safety Audit: Netlify → Vercel + Bilingual System

**Date:** June 24, 2026  
**Status:** Safety Check Before Production Deployment  
**Scope:** Verify current Netlify code won't conflict with new bilingual system  

---

## Summary

We're migrating from **Netlify (old)** → **Vercel + Supabase (new bilingual system)**. This document identifies:
- What's different between the two systems
- What conflicts exist
- What must be verified before moving to mypilatespro.co

**CRITICAL FINDING:** The original architecture and our bilingual system use **different database schemas**. Must choose ONE before production.

---

## Schema Comparison

### Original Architecture (TECH_ARCHITECTURE.md)
10 tables designed for complete class booking system:

| Table | Purpose | Bilingual? |
|-------|---------|-----------|
| `user` | Trainers & clients | No |
| `client` | Client profiles | No |
| `class` | Scheduled classes | No |
| `booking` | Client class bookings | No |
| `workout_log` | Training sessions | No |
| `exercise_log_item` | Exercises within workouts | No |
| `exercise` | Exercise bank | **Single-language only** |
| `membership` | Class packages clients purchased | No |
| `membership_plan` | Available class plans | No |
| `payment` | Payment tracking | No |
| `studio_settings` | App configuration | No |

**Features:** Auth, class scheduling, booking system, payment tracking, membership management

**Exercise table structure:**
```sql
CREATE TABLE exercise (
  id UUID PRIMARY KEY,
  name VARCHAR(255),           -- SINGLE LANGUAGE
  description TEXT,            -- SINGLE LANGUAGE
  instructions TEXT,           -- SINGLE LANGUAGE
  category VARCHAR(100),
  difficulty VARCHAR(50),      -- SINGLE LANGUAGE
  photo_url VARCHAR(1000),
  created_by_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

### Current Bilingual System (supabase_schema.sql)
6 custom tables focused on exercise management + class training:

| Table | Purpose | Bilingual? |
|-------|---------|-----------|
| `master_exercise` | Exercise bank | **YES - full bilingual** |
| `exercise_image` | Multiple images per exercise | No |
| `exercise_note` | Trainer + client notes | No |
| `class` | Training sessions (simplified) | No |
| `class_exercise_instance` | Exercises used in a class | No |
| `class_completion` | Track class completion | No |
| `user_language_preference` | Client language choice | N/A |

**Features:** Bilingual exercise management, class training logging, exercise notes, image gallery

**Master Exercise table structure:**
```sql
CREATE TABLE master_exercise (
  id UUID PRIMARY KEY,
  
  -- BILINGUAL
  name_en VARCHAR(255),           -- English
  name_cn VARCHAR(255),           -- Chinese
  description_en TEXT,            -- English
  description_cn TEXT,            -- Chinese
  instructions_en TEXT,           -- English
  instructions_cn TEXT,           -- Chinese
  type_en VARCHAR(100),           -- English: 'Pilates Mat'
  type_cn VARCHAR(100),           -- Chinese: '普拉提垫上'
  difficulty_en VARCHAR(50),      -- English: 'Beginner'
  difficulty_cn VARCHAR(50),      -- Chinese: '初级'
  target_muscles_en VARCHAR(500), -- English: 'Core, Chest'
  target_muscles_cn VARCHAR(500), -- Chinese: '核心, 胸部'
  
  -- UNIVERSAL (not translated)
  featured_image_url VARCHAR(1000),
  default_sets INTEGER,
  default_reps INTEGER,
  default_weight DECIMAL(10,2),
  default_weight_unit VARCHAR(20),
  default_duration INTEGER,
  default_duration_unit VARCHAR(20),
  
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Critical Conflicts Identified

### ⚠️ CONFLICT #1: Exercise Table vs Master Exercise
- **Original:** Single `exercise` table (monolingual)
- **Current:** Custom `master_exercise` table (bilingual)
- **Impact:** These are INCOMPATIBLE. Foreign keys break if you try to use both.
- **Risk Level:** 🔴 CRITICAL

**Resolution Options:**
1. **Option A (RECOMMENDED):** Keep `master_exercise`, deprecate original `exercise` table
   - Keep 37 existing bilingual exercises
   - Update all FK references to point to `master_exercise`
   - Pros: All your work preserved, full bilingual support
   - Cons: Rebuilds parts of original architecture

2. **Option B:** Use original `exercise` table, migrate bilingual data
   - Add bilingual columns to original `exercise` table
   - Run migration script to populate columns
   - Drop `master_exercise`
   - Pros: Closer to original architecture
   - Cons: Must backport your 37 exercises manually

**Current Status:** System uses `master_exercise` with 37 exercises already loaded

---

### ⚠️ CONFLICT #2: Booking System Missing
- **Original:** Full booking system: `booking`, `membership`, `membership_plan`, `payment` tables
- **Current:** No booking tables
- **Impact:** Current system can't do class bookings yet
- **Risk Level:** 🟡 MEDIUM (if you plan to use bookings)

**What's working now:**
- ✅ Exercise management (bilingual)
- ✅ Class creation & tracking
- ✅ Class completion logging

**What's NOT working:**
- ❌ Client bookings for classes
- ❌ Membership tracking
- ❌ Payment recording
- ❌ Class capacity/waitlist

**Resolution:** Create booking tables before production if needed. Use original schema as reference.

---

### ⚠️ CONFLICT #3: User Authentication Tables
- **Original:** Expects `user` and `client` tables + Supabase Auth integration
- **Current:** Uses Supabase Auth but no explicit user/client tables created yet
- **Impact:** Code expects these tables to exist; missing tables = 404s on user endpoints
- **Risk Level:** 🟡 MEDIUM

**What must exist:**
```sql
CREATE TABLE "user" (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) CHECK (role IN ('CLIENT', 'ADMIN')),
  bio TEXT,
  certificate TEXT,
  photo_url VARCHAR(1000),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE client (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  date_joined TIMESTAMP,
  emergency_contact VARCHAR(255),
  injury_notes TEXT,
  goals TEXT,
  -- ... other fields
);
```

**Current Status:** These tables NOT created yet. Will cause errors if auth code tries to use them.

---

### ⚠️ CONFLICT #4: API Endpoints Expect Different Schema
- **Original:** API routes expect `exercise` table (monolingual)
- **Current:** API routes built for `master_exercise` table (bilingual)
- **Impact:** If you try to run original API code against current database = column mismatch errors
- **Risk Level:** 🟢 LOW (we already fixed this)

**Current Status:** ✅ API endpoints updated to use `master_exercise` with proper bilingual column names

---

### ⚠️ CONFLICT #5: RLS Policies Incomplete
- **Original:** Full RLS policies for all 10 tables
- **Current:** RLS policies created for 6 tables; `master_exercise` has RLS **DISABLED**
- **Impact:** No access control on master_exercise table; anyone can modify exercises if they know the API
- **Risk Level:** 🟠 MEDIUM (security issue for production)

**Current Status:** RLS disabled to allow Excel import. Should be re-enabled after migration.

**Recommended:** After moving to mypilatespro.co, enable RLS:
```sql
ALTER TABLE master_exercise ENABLE ROW LEVEL SECURITY;

-- Add policy: Only creator can modify their own exercises
CREATE POLICY "Users can only modify their own exercises" ON master_exercise
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Add policy: All can view exercises
CREATE POLICY "Anyone can view exercises" ON master_exercise
  FOR SELECT USING (true);
```

---

## Checklist Before Production Deployment

### Database Schema
- [ ] **DECIDE:** Use `master_exercise` (bilingual) or migrate back to original `exercise` table?
  - Recommended: Keep `master_exercise` 
  - If yes, continue below
  - If no, run migration script (not yet written)

- [ ] Create missing auth tables (`user`, `client`) from original schema
- [ ] Create booking/membership tables if you plan to use them
- [ ] Verify all 37 exercises are in `master_exercise` table
- [ ] Check for duplicate exercises (verify using `COUNT DISTINCT name_en`)
- [ ] Validate language content: spot-check 3 English exercises, 3 Chinese translations

### API Routes
- [ ] Verify `/api/exercises` endpoint works with `master_exercise`
- [ ] Verify `/api/exercises/[id]` GET/PUT/DELETE work correctly
- [ ] Test with curl or Postman:
  ```bash
  curl -H "x-user-id: YOUR_TRAINER_ID" https://mypilatespro.co/api/exercises
  ```
- [ ] Check error handling: what happens if exercise_id doesn't exist?

### Frontend Pages
- [ ] `/dashboard/exercises` - Can you list all exercises?
- [ ] `/dashboard/exercises/[id]` - Can you view exercise details + language toggle?
- [ ] `/dashboard/exercises/[id]/edit` - Can you edit bilingual fields?
- [ ] `/dashboard/exercises/import` - Can you import new Excel files?
- [ ] Search functionality: Does search work across both name_en and name_cn?

### Environment Variables (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = your service role key
- [ ] `.env.local` NOT committed to GitHub

### Authentication
- [ ] Can you sign up with email/password?
- [ ] Can trainers create exercises?
- [ ] Can clients see exercises but not create?
- [ ] Do RLS policies enforce access correctly?

### Security
- [ ] All endpoints verify user_id before allowing modifications
- [ ] No API keys exposed in frontend code
- [ ] `.env.local` in `.gitignore`
- [ ] Supabase Auth email verification enabled (optional but recommended)

---

## What WILL Break When You Deploy

### 1. Original API Endpoints Will Fail
**If** you had deployed the original architecture to Netlify with endpoints expecting the original `exercise` table:
```
❌ Original code: SELECT * FROM exercise WHERE id = ?
✅ New code: SELECT * FROM master_exercise WHERE id = ?
```
**Fix:** Use new API routes in `/app/api/exercises/` (already updated)

### 2. Original Admin Dashboard Won't Work
**If** you had a trainer dashboard built for the original schema:
```
❌ Original: "Booking management", "Class management", "Payment tracking"
✅ New: "Exercise library", "Class training", "Exercise notes"
```
**Status:** New pages already built at `/app/dashboard/exercises/`

### 3. Client Booking System Won't Work
**If** clients were booking classes on the old Netlify site:
```
❌ Old: POST /api/bookings - needs booking table
✅ New: No booking yet - needs implementation
```
**Impact:** Clients won't be able to book. Need to either:
- Implement booking tables + API routes (big feature)
- Keep old Netlify site for bookings until ready

### 4. User Accounts May Conflict
**If** old Netlify has users in a different auth system:
- Old: May have used basic auth or Firebase
- New: Uses Supabase Auth
- **Action:** User migration script needed if you have existing users

**Current Status:** This is a fresh deployment, so no migration needed.

---

## What WILL Work Fine

✅ **Exercise Management**
- All 37 exercises in database
- Bilingual display (English/Chinese toggle)
- Exercise editing
- Excel import

✅ **Basic Class Tracking**
- Create classes
- Assign exercises to classes
- Log class completion
- Add notes/feedback

✅ **Multi-language Support**
- User language preference saved
- Content displays in chosen language
- Both EN and CN fully populated

✅ **API Structure**
- Next.js API routes work
- Supabase client integration
- Service role key for bulk operations

---

## Recommended Deployment Order

### Phase 1: Deploy Bilingual Exercise System (READY NOW)
```
✅ Exercises (master_exercise table)
✅ Class training logging
✅ Exercise notes & images
✅ Bilingual UI
```
**Timeline:** Deploy immediately when you're ready

**Deployment steps:**
1. Push code to GitHub
2. Deploy to Vercel
3. Set environment variables in Vercel dashboard
4. Run database schema in Supabase (supabase_schema.sql)
5. Test at mypilatespro.co

### Phase 2: Add Missing Auth System (NEEDED IF YOU USE LOGIN)
```
Create: user + client tables
Create: RLS policies for user data
Build: Login/signup pages (basic, already in architecture)
```
**Timeline:** 2-3 days

### Phase 3: Add Booking System (OPTIONAL)
```
Create: booking + membership tables
Create: Class schedule view
Create: Booking UI for clients
```
**Timeline:** 1-2 weeks (if you want full booking)

---

## Quick Risk Assessment

| Component | Old Netlify | New System | Risk Level | Action |
|-----------|------------|-----------|------------|--------|
| Exercise Library | ❌ Not there | ✅ Bilingual | LOW | Ready to deploy |
| Class Tracking | ❌ Not there | ✅ Works | LOW | Ready to deploy |
| Client Bookings | ❌ Unclear | ❌ Not yet | MEDIUM | Decide if needed |
| User Auth | ❌ Unknown | ✅ Ready | LOW | Create user tables |
| Bilingual Support | ❌ No | ✅ Full | LOW | Ready to deploy |
| RLS Security | ❌ Unknown | ⚠️ Disabled | MEDIUM | Re-enable after launch |

---

## Final Verdict

**Can you safely deploy to mypilatespro.co?**

✅ **YES** — for the bilingual exercise system  
⚠️ **MAYBE** — for user login (need to create auth tables first)  
❌ **NO** — for client bookings (not implemented yet)

**Recommended:** Deploy now with exercise system, add auth tables next week, add bookings later if needed.

---

## Next Steps

1. **Review this audit** — does everything align with your plans?
2. **Choose:** Keep `master_exercise` (bilingual) or revert to original `exercise` table?
3. **Verify:** Test all API endpoints locally before deploying
4. **Deploy:** Push to GitHub → auto-deploys to Vercel
5. **Test:** Verify mypilatespro.co works
6. **Secure:** Re-enable RLS policies after verifying everything works

---

**Document Owner:** Claude  
**Last Reviewed:** June 24, 2026  
**Status:** Ready for review by Jessica
