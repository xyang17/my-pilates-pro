# MyPilatesPro - Comprehensive Setup & Implementation Guide

## 📋 Complete System Overview

You now have a **professional exercise-centric training system** with:

### ✅ Core Features Built

**1. Exercise Library (Master Exercise System)**
- ✅ Bilingual exercise names (English + Chinese)
- ✅ Detailed instructions & descriptions
- ✅ Default parameters (sets, reps, weight, duration with flexible units)
- ✅ Multi-image support (up to 3 images per exercise)
- ✅ Featured image selection (shows on cards)
- ✅ Image captions & gallery view
- ✅ Trainer & client notes (visible to both for learning)
- ✅ Full CRUD operations

**2. Class Training System**
- ✅ Create classes (trainer or client self-training)
- ✅ Add exercises to classes (with customizable parameters)
- ✅ Override default values per class use
- ✅ Exercise reuse from past classes (encourages learning)
- ✅ Track class status (planned, in-progress, completed)

**3. Bulk Exercise Import**
- ✅ Excel template with examples
- ✅ Batch upload system
- ✅ Image URL support (1-3 per exercise)
- ✅ Default parameters preset
- ✅ Data validation (dropdowns for units)
- ✅ Error reporting

**4. User Experience**
- ✅ Authentication (login/signup)
- ✅ Role-based access (TRAINER/CLIENT)
- ✅ Protected routes
- ✅ Responsive UI design

---

## 🗄️ Database Setup - REQUIRED STEP

### Step 1: Update Database Schema

Your database needs to be updated with new columns. Run this SQL in Supabase:

```sql
-- Drop existing master_exercise table to rebuild with new columns
DROP TABLE IF EXISTS class_completion CASCADE;
DROP TABLE IF EXISTS class_exercise_instance CASCADE;
DROP TABLE IF EXISTS class CASCADE;
DROP TABLE IF EXISTS exercise_note CASCADE;
DROP TABLE IF EXISTS exercise_image CASCADE;
DROP TABLE IF EXISTS master_exercise CASCADE;

-- Then run the full schema from: /docs/supabase_schema.sql
```

Copy the entire content from `/docs/supabase_schema.sql` and paste it into your Supabase SQL Editor, then click **Run**.

**This creates:**
- `master_exercise` (with default parameters + featured_image_url)
- `exercise_image` (for multiple images per exercise)
- `exercise_note` (for trainer/client notes)
- `class` (training sessions)
- `class_exercise_instance` (exercises in classes)
- `class_completion` (completion tracking)

All tables have Row Level Security (RLS) enabled.

---

## 📊 How to Use the System

### For Trainers:

#### Option A: Create Exercises One-by-One (UI)
1. Go to `/dashboard/exercises` → "+ New Exercise"
2. Fill in bilingual names, description, instructions
3. Set default parameters (sets, reps, weight, duration)
4. Add featured image URL
5. Save

#### Option B: Bulk Import from Excel (Recommended)
1. Go to `/dashboard/exercises` → "📥 Import from Excel"
2. Click "Download Excel Template"
3. Fill in the template (examples provided)
4. Upload the file
5. System creates all exercises + attaches images

**Excel Template Columns:**
```
nameEN                  - Exercise name in English (REQUIRED)
nameCN                  - Exercise name in Chinese (REQUIRED)
description             - What the exercise does
instructions            - How to perform it
defaultSets            - Default # of sets (e.g., 3)
defaultReps            - Default # of reps (e.g., 12)
defaultWeight          - Default weight amount (e.g., 5)
defaultWeightUnit      - kg | lbs | bodyweight
defaultDuration        - Default duration (e.g., 60)
defaultDurationUnit    - minutes | seconds
imageUrl1, imageUrl2, imageUrl3  - Image URLs
imageCaption1, imageCaption2, imageCaption3 - Captions
featuredImageUrl       - Which image shows on cards
```

#### Create Classes
1. Go to `/dashboard/classes` → "+ New Class"
2. Set date, duration, type, notes
3. Click "+ Add Exercise"
4. Select exercises from your library
5. Customize sets/reps/weight/duration if needed
6. Save

#### Add Notes to Exercises
1. Open any exercise detail page
2. Scroll to "Notes & Feedback" section
3. Add trainer or client note
4. Note is visible to both trainer and client
5. Encourages learning through feedback

### For Clients:

#### View Trainer Classes
- See all classes assigned to you
- View all exercises with trainer's instructions
- See default parameters and images

#### Self-Training
1. Create your own class (for self-training)
2. Select exercises from past trainer classes
3. Modify parameters to challenge yourself
4. Trainer can review and provide feedback

#### Add Notes
- Share your feedback on exercises
- See trainer's notes for improvement tips

---

## 🔄 Data Flow & Features

### Exercise Reuse System (Encourages Learning)
```
Trainer Creates Exercise
    ↓
    Trainer Creates Class → Adds Exercise → Sets Parameters
    ↓
    Client Sees Class → Uses Exercise with Trainer's Default Parameters
    ↓
    Client Can Self-Train → Reuse Exercise → Modify Parameters
    ↓
    Trainer Reviews → Provides Notes/Feedback
    ↓
    Client Learns → Improves → Progresses
```

### Default Parameters System
```
Master Exercise
    ├─ default_sets: 3
    ├─ default_reps: 12
    ├─ default_weight: 5 kg
    └─ default_duration: 60 seconds

When Added to Class:
    ├─ Uses master defaults initially
    ├─ Trainer can override per class
    └─ Client sees both master + actual values
```

### Multi-Image Gallery
```
Exercise Images:
    ├─ image_url_1 (Starting position)
    ├─ image_url_2 (Mid-movement)
    └─ image_url_3 (End position)

Featured Image:
    └─ Shows on exercise cards in lists
```

---

## 📁 Project Structure

```
app/
├── api/
│   └── exercises/
│       ├── route.ts              (Create, list exercises)
│       ├── [id]/route.ts         (Get, update exercise)
│       ├── [id]/images/route.ts  (Manage exercise images)
│       ├── [id]/notes/route.ts   (Add notes to exercises)
│       └── import/route.ts       (Bulk import from Excel)
│   └── classes/
│       ├── route.ts              (Create, list classes)
│       ├── [id]/route.ts         (Get, update class)
│       └── [id]/exercises/...    (Add exercises to classes)
│
├── dashboard/
│   ├── exercises/
│   │   ├── page.tsx              (Exercise library)
│   │   ├── new/page.tsx          (Create exercise)
│   │   ├── [id]/page.tsx         (Exercise detail + notes)
│   │   └── import/page.tsx       (Bulk import page)
│   │
│   └── classes/
│       ├── page.tsx              (Classes list)
│       ├── new/page.tsx          (Create class)
│       └── [id]/page.tsx         (Class detail + manage exercises)
│
├── context/
│   └── AuthContext.tsx           (Auth provider)
│
└── docs/
    ├── supabase_schema.sql       (Database schema)
    ├── Exercise_Import_Template.xlsx  (Excel template)
    └── COMPREHENSIVE_SETUP_GUIDE.md   (This file)

public/
└── Exercise_Import_Template.xlsx (Download template)
```

---

## 🔐 Security & Permissions

### Row Level Security (RLS)
- Trainers can only see exercises they created
- Trainers can see all classes they created
- Clients see trainers' classes assigned to them + their own
- Notes are visible to both parties

### User Roles
- **TRAINER**: Can create exercises, classes, assign to clients
- **CLIENT**: Can view assigned classes, create self-training, add notes

### Data Access
- Headers include: `x-user-id`, `x-user-role`, `x-user-name`
- All API calls verify user ownership/permissions
- Database policies enforce access control

---

## 📈 What's Next (Phase 2-3)

### Phase 1.5 (Homework Assignment - Next)
- [ ] Create `homework_assignment` table
- [ ] UI to assign exercises from classes as homework
- [ ] Client completes homework with notes
- [ ] Trainer reviews and grades

### Phase 2 (Workout Logging)
- [ ] Track actual performance vs defaults
- [ ] Weight lifted history
- [ ] Progress charts over time
- [ ] Form notes & improvements

### Phase 3 (Client Profile & Analytics)
- [ ] Personal goals
- [ ] Training history timeline
- [ ] Progress visualizations
- [ ] Trainer recommendations

### Future Enhancements
- [ ] Video/animated GIF support (动图)
- [ ] Exercise variations & progressions
- [ ] Class schedule calendar
- [ ] Mobile app
- [ ] Push notifications
- [ ] Integration with wearables

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: CSS-in-JS (inline styles)
- **File Format**: Excel (.xlsx) via SheetJS

---

## 🐛 Troubleshooting

### Database Issues

**Error: "column does not exist"**
- Ensure you ran the SQL schema from `/docs/supabase_schema.sql`
- Check that all tables were created: `master_exercise`, `exercise_image`, `exercise_note`, `class`, etc.

**RLS Blocking Access**
- Verify user is authenticated
- Check `x-user-role` header is set correctly
- Confirm user_id matches `created_by` in records

### Import Issues

**Excel File Not Uploading**
- File must be .xlsx format (not .xls)
- Required columns: `nameEN`, `nameCN`
- Check for empty rows or special characters

**Images Not Displaying**
- Verify image URLs are complete (include https://)
- Check URLs are publicly accessible
- Featured image should match one of imageUrl1/2/3

### UI/Display Issues

**Classes Not Showing Exercises**
- Ensure class was fetched with exercises included
- Check `order` column is populated
- Verify `class_exercise_instance` records exist

**Notes Not Appearing**
- Ensure `exercise_note` table has RLS enabled
- Check notes were created with correct `exercise_id`
- Verify `author_type` is 'trainer' or 'client'

---

## 📞 Quick Reference

### API Endpoints Summary

```
EXERCISES
GET    /api/exercises              - List user's exercises
POST   /api/exercises              - Create exercise
GET    /api/exercises/[id]         - Get exercise details with images & notes
PUT    /api/exercises/[id]         - Update exercise
POST   /api/exercises/[id]/images  - Add images to exercise
DELETE /api/exercises/[id]/images/[imageId] - Delete image
POST   /api/exercises/[id]/notes   - Add note to exercise
POST   /api/exercises/import       - Bulk import exercises

CLASSES
GET    /api/classes                - List user's classes
POST   /api/classes                - Create class
GET    /api/classes/[id]           - Get class with exercises
PUT    /api/classes/[id]           - Update class
GET    /api/classes/[id]/exercises - List exercises in class
POST   /api/classes/[id]/exercises - Add exercise to class
PUT    /api/classes/[id]/exercises/[id] - Update exercise in class
DELETE /api/classes/[id]/exercises/[id] - Remove exercise from class
```

### Excel Template Download
`/dashboard/exercises/import` → "Download Excel Template"

### Demo Data
Use the Excel template's example rows to see:
- "Pilates Push-up" / "普拉提俯卧撑"
- "Reformer Legs Spring" / "改革机腿弹簧"

---

## ✨ Key Design Principles

1. **Exercise-Centric**: Everything flows from exercises
2. **Flexible Parameters**: Sets, reps, weight (multiple units), duration
3. **Bilingual Support**: English + Chinese for global accessibility
4. **Learning-Focused**: Clients learn by reusing and modifying exercises
5. **Trainer Control**: Trainers set defaults, clients adapt
6. **Transparent Feedback**: All notes visible to both parties
7. **Scalable**: Excel bulk import for quick onboarding

---

## 🎯 Success Metrics

- ✅ Trainers can create exercises in seconds (via Excel)
- ✅ Clients see clear instructions with images
- ✅ Feedback loop encourages learning & independence
- ✅ System scales from 10 to 10,000 exercises
- ✅ Multi-image support for different exercise phases

---

**System Ready!** 🚀 You're now ready to:
1. Run SQL schema in Supabase
2. Test with the Excel template
3. Create your first exercises and classes
4. Start training your clients!
