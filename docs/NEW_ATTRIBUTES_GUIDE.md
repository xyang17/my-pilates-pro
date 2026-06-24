# Exercise Attributes Update - Type, Difficulty, Target Muscles

## ✅ What's New

Added **3 important exercise attributes** to make exercises more organized and searchable:

### 1. **Type** (Exercise Category)
```
Options:
- Pilates Reformer
- Pilates Mat
- Pilates Cadillac
- Fitness
- Stretching
- Strength
- Cardio
```
Allows filtering by equipment/workout type.

### 2. **Difficulty Level**
```
Options:
- Beginner
- Intermediate
- Advanced
```
Color-coded in UI (Green/Orange/Red). Helps trainers structure progressive training.

### 3. **Target Muscles**
```
Examples:
- Core, Glutes, Hamstrings
- Chest, Arms, Shoulders
- Hip Stabilizers, Core
- Lower Back, Spine
- Quadriceps, Glutes, Hamstrings
```
Comma-separated muscle groups. Helps clients understand what's being worked.

---

## 📊 Database Changes

### `master_exercise` table updated:
```sql
type VARCHAR(100)                    -- Pilates Reformer, Pilates Mat, etc.
difficulty VARCHAR(50)               -- Beginner, Intermediate, Advanced
target_muscles VARCHAR(500)           -- Comma-separated: 'Core,Glutes,Hamstrings'
```

### UI Display:
- Exercise detail page shows all three attributes
- Difficulty is color-coded:
  - 🟢 Beginner (Green)
  - 🟠 Intermediate (Orange)
  - 🔴 Advanced (Red)

---

## 🎯 Updated Test Data

All 10 test exercises now include these attributes:

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

## 📝 Excel Template Columns

The new Excel template includes:
```
nameEN, nameCN, description, instructions,
type, difficulty, targetMuscles,
defaultSets, defaultReps, defaultWeight, defaultWeightUnit,
defaultDuration, defaultDurationUnit,
imageUrl1, imageCaption1, imageUrl2, imageCaption2,
imageUrl3, imageCaption3, featuredImageUrl
```

### With Data Validation:
- **Type**: Dropdown with 7 options
- **Difficulty**: Dropdown with 3 options (Beginner, Intermediate, Advanced)
- **Target Muscles**: Free text (comma-separated)
- **Weight Unit**: Dropdown (kg, lbs, bodyweight)
- **Duration Unit**: Dropdown (minutes, seconds)

---

## 🚀 How to Use

### Creating/Importing Exercises:

1. **Via Form** (`/dashboard/exercises/new`):
   - Select Type from dropdown
   - Select Difficulty Level
   - Type target muscles (comma-separated)
   - Fill other fields
   - Save

2. **Via Excel** (`/dashboard/exercises/import`):
   - Download updated template
   - Fill in all fields including Type, Difficulty, Target Muscles
   - Upload file

### Viewing Exercises:

1. **Exercise Library** (`/dashboard/exercises`):
   - Click any exercise to see all attributes
   - Attributes displayed in colored tags

2. **Exercise Detail** (`/dashboard/exercises/[id]`):
   - Type shown prominently
   - Difficulty color-coded
   - Target muscles listed

### Future Filtering:

These attributes enable:
- Filter by Type (Mat vs Reformer)
- Filter by Difficulty (Build progressions)
- Filter by Target Muscle (Find exercises for specific areas)
- Training recommendations ("Client is Beginner, show Beginner exercises")

---

## 📋 API Changes

### All endpoints now support:
- `type` (string, optional)
- `difficulty` (string, optional)
- `targetMuscles` (string, optional)

### Examples:
```json
POST /api/exercises
{
  "nameEN": "Pilates Push-up",
  "nameCN": "普拉提俯卧撑",
  "type": "Pilates Mat",
  "difficulty": "Intermediate",
  "targetMuscles": "Core,Chest,Arms",
  ...
}
```

---

## 🎯 Migration from Old Data

If you imported the old test data, you can:
1. Delete those exercises
2. Download the new `Test_Exercises_v2.xlsx`
3. Import the updated version with all attributes

Or manually add attributes to existing exercises via the UI.

---

## 💡 Best Practices

### Type Selection:
- Use "Pilates Reformer" for exercises requiring equipment
- Use "Pilates Mat" for floor exercises
- Use "Fitness" for general fitness
- Use "Stretching" for flexibility work
- Use "Strength" for strength-focused work

### Difficulty Progression:
- Build classes by difficulty level
- Beginner → Intermediate → Advanced
- Use for client assessment & planning

### Target Muscles:
- Be specific: "Core, Lower Abs" not just "Core"
- Multiple muscles: "Quadriceps, Glutes, Hamstrings"
- Use standard anatomical names
- Helps clients understand what's working

---

## 📥 Download Updated Files

Available in `/dashboard/exercises/import`:
- **Test_Exercises_v2.xlsx** - 10 exercises ready to import
- **Exercise_Import_Template_v2.xlsx** - Blank template for your exercises

---

## ✨ What's Next

With these attributes in place, you can build:
1. **Smart Class Builder** - "Show me Beginner exercises for Core"
2. **Training Plans** - Progressive difficulty 
3. **Client Assessments** - "Which muscles do you want to focus on?"
4. **Exercise Library Filters** - Browse by type/difficulty/muscles
5. **Recommendations** - "Based on your level, try these..."

---

**Everything is backward compatible!** Old exercises still work, new attributes are optional but recommended. 🎯
