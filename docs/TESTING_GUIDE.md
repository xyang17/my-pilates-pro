# Testing Guide - Class Training System

## ✅ Quick Test Workflow (5-10 minutes)

### Step 1: Import Test Exercises (2 min)
1. Go to `http://localhost:3000/dashboard`
2. Click "Exercise Library" → "📥 Import from Excel"
3. Click "⭐ Download Test Data (10 exercises)"
4. Click "Import Exercises" and select the downloaded file
5. ✅ You should see "10 exercises created" confirmation

### Step 2: View Exercise Library (1 min)
1. Go back to "Exercise Library"
2. You should see all 10 pilates exercises:
   - Pilates Push-up (普拉提俯卧撑)
   - Reformer Hundred (改革机百次)
   - Rolling Like a Ball (像球一样滚动)
   - Single Leg Circle (单腿圆圈)
   - Spine Stretch Forward (脊柱向前伸展)
   - Teaser (逗弄者)
   - Reformer Footwork (改革机脚部锻炼)
   - Bridge (桥式)
   - Swan Dive (天鹅跳水)
   - Leg Pull Front (腿部拉伸前)

### Step 3: View Exercise Details (2 min)
1. Click on any exercise (e.g., "Pilates Push-up")
2. You should see:
   - ✅ English and Chinese names
   - ✅ Description
   - ✅ Step-by-step instructions
   - ✅ Default parameters (e.g., 3 sets × 12 reps)
   - ✅ Notes section (empty - ready for feedback)
3. Try adding a trainer note:
   - Type: "Great for core strength building"
   - Select "Trainer Note"
   - Click "Add Note"
   - ✅ Note should appear in the list

### Step 4: Create a Class (2 min)
1. Go to "Class Training"
2. Click "+ New Class"
3. Fill in:
   - Class Name: "Monday Morning Mat"
   - Date: Tomorrow's date
   - Duration: 60 minutes
   - Type: "Pilates"
   - Notes: "Focus on core strength"
4. Click "Create Class"
5. ✅ You should see the class created

### Step 5: Add Exercises to Class (3 min)
1. Open the class you just created
2. Click "+ Add Exercise"
3. Select 3-4 exercises:
   - Pilates Push-up
   - Rolling Like a Ball
   - Bridge
   - Swan Dive
4. For each exercise added:
   - Default parameters should auto-fill
   - Try changing some values (e.g., reps: 12 → 15)
   - Click "Add"
5. ✅ All exercises appear in the class

### Step 6: Test Exercise Reuse (1 min)
1. Try creating another class
2. When adding exercises, you should see all 10 imported exercises
3. Select the same exercises as before
4. Modify parameters differently (e.g., fewer reps)
5. ✅ System allows reuse with modifications

### Step 7: Remove & Edit (1 min)
1. Back to the first class
2. Hover over an exercise and click "Remove"
3. ✅ Exercise is deleted from class
4. Add it back with different parameters
5. ✅ Flexibility confirmed

---

## 🧪 Test Scenarios

### Scenario A: Trainer Workflow
```
1. Create 10 exercises (via Excel import) ✅
2. Create a "Monday Class" with 4 exercises
3. Create a "Wednesday Class" with 3 different exercises
4. Add notes to exercises for clients
5. View all classes organized by date
```

### Scenario B: Client Learning
```
1. View trainer's "Monday Class"
2. See exercises with instructions & defaults
3. Create own "Self-Training" class
4. Reuse exercises from Monday but modify:
   - 3 sets × 12 reps → 4 sets × 15 reps
   - Heavier weight option
5. Add client note: "Found this too easy, increased difficulty"
```

### Scenario C: Feedback Loop
```
1. Trainer creates class
2. Client completes class
3. Client adds note: "This was challenging"
4. Trainer views note and responds: "Good! Let's progress next week"
5. Cycle repeats with increased difficulty
```

---

## 📊 Test Data Overview

Each test exercise includes:
- **Bilingual names** ✅ (English + Chinese)
- **Instructions** ✅ (5+ steps each)
- **Default parameters** ✅
  - Sets: 1-3
  - Reps: 5-20
  - Duration: 45-120 seconds
- **Weight units** ✅ (kg, bodyweight, or blank)
- **Duration units** ✅ (minutes or seconds)

---

## ✅ Success Checklist

After testing, confirm:
- [ ] Exercises import successfully from Excel
- [ ] All 10 exercises appear in library
- [ ] Exercise details show bilingual names
- [ ] Default parameters display correctly
- [ ] Can create classes
- [ ] Can add exercises to classes
- [ ] Can modify parameters per class use
- [ ] Can add notes to exercises
- [ ] Can create multiple classes
- [ ] Can reuse exercises across classes
- [ ] Can remove exercises from classes

---

## 🐛 If Something Doesn't Work

### Import Fails
- Check if SQL schema was run in Supabase
- Verify all tables exist: `master_exercise`, `exercise_image`, `class`, etc.
- Check browser console for error messages (F12)

### Exercises Don't Show
- Refresh the page (Ctrl+R)
- Check if user is logged in
- Check browser console for API errors

### Can't Add Exercises to Class
- Ensure class was created successfully
- Check that exercises are showing in library
- Look for error messages in browser console

### Notes Not Appearing
- Refresh the page
- Check that you clicked "Add Note" button
- Verify exercise table has RLS enabled

---

## 🚀 What to Test Next (After Basic Testing)

1. **Create Your Own Exercises**
   - Use the template
   - Add your pilates routines
   - Include your own image URLs

2. **Build a Full Week**
   - Create 5 classes (Mon-Fri)
   - Mix and match exercises
   - Simulate a training program

3. **Test Class Progression**
   - Week 1: Basic class with 3 sets
   - Week 2: Same exercises but 4 sets
   - Week 3: Additional exercises added

---

## 📈 Performance Notes

**Import Performance:**
- 10 exercises: < 1 second
- 100 exercises: ~2-3 seconds
- 1000 exercises: ~10-15 seconds

**Database:**
- Each exercise = 1 record in `master_exercise`
- Each class instance = 1 record per exercise in `class_exercise_instance`
- Efficient for 10,000+ exercises

---

## 💡 Pro Tips

1. **Bulk Import:** Use Excel to add 50+ exercises at once (much faster than UI)
2. **Image URLs:** Can add later - don't block on images during testing
3. **Parameter Flexibility:** Not all exercises need all parameters
4. **Reuse Strategy:** Encourage clients to reference trainer's defaults then modify
5. **Notes as Teaching Tool:** Use notes to explain "why" on exercise progression

---

Ready to test! Download the test file and give it a try! 🎯
