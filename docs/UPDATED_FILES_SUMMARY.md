# Updated Excel Files - With Type, Difficulty, Target Muscles

## 📥 Files Available for Download

### 1. **Exercise_Import_Template_v2.xlsx** ✅
Blank template with all columns and data validation.

**Columns Include:**
- nameEN, nameCN (Required)
- description, instructions
- **type** - Dropdown: Pilates Reformer, Pilates Mat, Pilates Cadillac, Fitness, Stretching, Strength, Cardio
- **difficulty** - Dropdown: Beginner, Intermediate, Advanced
- **targetMuscles** - Free text: "Core,Glutes,Hamstrings"
- defaultSets, defaultReps
- defaultWeight, defaultWeightUnit (Dropdown: kg, lbs, bodyweight)
- defaultDuration, defaultDurationUnit (Dropdown: minutes, seconds)
- imageUrl1, imageCaption1, imageUrl2, imageCaption2, imageUrl3, imageCaption3
- featuredImageUrl

**Data Validation Included:**
- Type: 7 options (dropdown)
- Difficulty: 3 options (dropdown)
- Weight Unit: 3 options (dropdown)
- Duration Unit: 2 options (dropdown)

---

### 2. **Test_Exercises_v2.xlsx** ✅
Pre-filled with 10 realistic pilates exercises including all attributes.

**10 Exercises Included:**

| Exercise | Type | Difficulty | Target Muscles |
|----------|------|-----------|-----------------|
| Pilates Push-up | Pilates Mat | Intermediate | Core, Chest, Arms |
| Reformer Hundred | Pilates Reformer | Beginner | Core, Lower Abs |
| Rolling Like a Ball | Pilates Mat | Beginner | Spine, Back |
| Single Leg Circle | Pilates Mat | Intermediate | Hip Stabilizers, Core |
| Spine Stretch Forward | Pilates Mat | Beginner | Hamstrings, Back, Spine |
| Teaser | Pilates Mat | Advanced | Core, Hip Flexors |
| Reformer Footwork | Pilates Reformer | Beginner | Quadriceps, Glutes, Hamstrings |
| Bridge | Pilates Mat | Beginner | Glutes, Lower Back, Hamstrings |
| Swan Dive | Pilates Mat | Intermediate | Back, Shoulders, Chest |
| Leg Pull Front | Pilates Mat | Advanced | Core, Shoulders, Hamstrings |

---

## 🎯 What's Different from v1

### Old Files (v1):
```
nameEN, nameCN, description, instructions,
defaultSets, defaultReps, defaultWeight, defaultWeightUnit,
defaultDuration, defaultDurationUnit,
imageUrl1, imageCaption1, ...
```

### New Files (v2):
```
nameEN, nameCN, description, instructions,
type, difficulty, targetMuscles,                    ← NEW!
defaultSets, defaultReps, defaultWeight, defaultWeightUnit,
defaultDuration, defaultDurationUnit,
imageUrl1, imageCaption1, ...
```

---

## ✅ How to Use

### Step 1: Download
Go to `/dashboard/exercises` → "📥 Import from Excel"
- Click "📥 Download Blank Template" → Get the template
- Click "⭐ Download Test Data" → Get example exercises

### Step 2: Fill (if using blank template)
1. Exercise name (English + Chinese) - REQUIRED
2. Type - Select from dropdown (Pilates Mat, Reformer, etc.)
3. Difficulty - Select from dropdown (Beginner, Intermediate, Advanced)
4. Target Muscles - Type comma-separated: "Core, Glutes"
5. Add other details (description, instructions, defaults, images)

### Step 3: Upload
1. Save as .xlsx
2. Go to `/dashboard/exercises/import`
3. Select file and upload
4. ✅ Exercises created with all attributes!

---

## 🔄 Migration from v1 Data

If you already imported the old test data:

**Option A: Delete & Re-import (Clean)**
1. Go to `/dashboard/exercises`
2. Delete the old exercises
3. Download `Test_Exercises_v2.xlsx`
4. Import the new version

**Option B: Keep & Add Manually**
1. Keep existing exercises
2. Edit each one to add Type, Difficulty, Target Muscles
3. Go to `/dashboard/exercises/[id]` (existing exercises don't have this yet)
4. Or use the form to create new ones with attributes

**Option C: Keep Both**
- Keep old exercises as-is
- Import new v2 exercises alongside them

---

## 📋 Example Excel Row

```
Pilates Push-up | 普拉提俯卧撑 | Modified push-up for core and chest | 1. Start in plank... | Pilates Mat | Intermediate | Core,Chest,Arms | 3 | 12 | | bodyweight | 60 | seconds | ... 
```

---

## 🎨 UI Display

When you create/import exercises with these attributes:

```
Exercise Name (English)
Exercise Name (Chinese)

┌─────────────────────────────┐
│ TYPE          DIFFICULTY    │
│ Pilates Mat   Intermediate  │
│              (Orange color) │
│                             │
│ TARGET MUSCLES              │
│ Core, Chest, Arms           │
└─────────────────────────────┘

Description: ...
Instructions: ...
```

---

## ✨ Benefits

With attributes, you can later build:
- **Filter system** - "Show me Beginner Pilates Mat exercises"
- **Smart recommendations** - "Based on your goals, try these..."
- **Progressive programs** - Beginner → Intermediate → Advanced
- **Muscle group focus** - "Focus on Core today"
- **Class building** - "Create a balanced full-body class"

---

## 📁 File Locations

Both files are available:
- `public/Exercise_Import_Template_v2.xlsx` - Blank template
- `public/Test_Exercises_v2.xlsx` - Sample data (10 exercises)
- `/dashboard/exercises/import` - Download page

---

**Ready to test!** Download the v2 files from the import page and try importing exercises with the new attributes. 🎯
