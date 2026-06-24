# Class Training System - Setup & Usage Guide

## 📋 What's Built

### Features Implemented
✅ **Exercise Library (Exercise-Centric)**
- Create master exercises with bilingual names (English + Chinese)
- Add detailed instructions and descriptions
- Placeholder for images and videos (for future implementation)
- Exercise notes system (trainer + client notes visible to both)
- Search and filter exercises

✅ **Class Training**
- Trainers create classes with date, duration, type, notes
- Add exercises to classes (with customizable sets, reps, weight units, duration)
- Clients can view their assigned classes
- Clients can create their own self-training classes
- Edit classes and exercises anytime (for trainers)

✅ **Exercise Reuse & Learning**
- When creating a class, clients can pick exercises from past trainer classes
- Clients can modify values (sets, reps, weight, etc.) to encourage learning
- All trainer and client notes are visible when reusing exercises

✅ **Flexible Parameters**
- Weight units: kg, lbs, bodyweight
- Duration units: minutes, seconds
- All per-exercise customization

### Database Tables Created
1. `master_exercise` - Core exercise records
2. `exercise_note` - Notes from trainers and clients
3. `class` - Training sessions
4. `class_exercise_instance` - Exercises in classes (can modify values)
5. `class_completion` - Track when classes are completed

### API Endpoints
```
GET/POST  /api/exercises              - List and create exercises
GET/PUT   /api/exercises/[id]         - Get and update exercise
POST      /api/exercises/[id]/notes   - Add notes to exercises

GET/POST  /api/classes                - List and create classes
GET/PUT   /api/classes/[id]           - Get and update class
GET/POST  /api/classes/[id]/exercises - Manage exercises in class
PUT/DEL   /api/classes/[id]/exercises/[id] - Update/delete exercise instance
```

### UI Pages
```
/dashboard/exercises              - Exercise library
/dashboard/exercises/new          - Create exercise
/dashboard/exercises/[id]         - Exercise detail (with notes)

/dashboard/classes               - Classes list
/dashboard/classes/new           - Create class
/dashboard/classes/[id]          - Class detail (manage exercises)
```

---

## 🗄️ Database Setup

### Step 1: Run the SQL Schema
1. Go to your Supabase dashboard → SQL Editor
2. Copy the entire content from `/docs/supabase_schema.sql`
3. Paste it and click "Run"
4. All tables and RLS policies will be created

### Step 2: Test the Connection
The API endpoints include authentication headers that fetch from Supabase. Once tables are created, the app should work immediately.

---

## 🚀 How to Use

### As a Trainer:
1. **Create Exercises First**
   - Go to Exercise Library → New Exercise
   - Fill in English name, Chinese name, instructions
   - Save. You can add images/videos later

2. **Create a Class**
   - Go to Classes → New Class
   - Fill in class details (name, date, duration, type)
   - Save

3. **Add Exercises to Class**
   - Open the class
   - Click "+ Add Exercise"
   - Select from your exercise library
   - Customize sets, reps, weight, duration if needed
   - Save

4. **Send to Client & Add Homework**
   - Client sees the class and can view exercises
   - (Homework assignment will be built next)

5. **Monitor Progress**
   - View all your clients' classes and self-training
   - Provide feedback and notes

### As a Client:
1. **View Trainer Classes**
   - See classes assigned to you
   - View detailed exercises with trainer instructions

2. **Self-Training**
   - Create your own class
   - Pick exercises from past trainer classes
   - Modify values to challenge yourself
   - System logs this for trainer to review

3. **Add Notes**
   - Leave feedback on exercises
   - Share what worked well or what was difficult
   - Read trainer's notes for improvements

---

## 📝 Next Steps

### Phase 1.5 - Homework Assignment System
1. Create `homework_assignment` table
2. Trainers assign exercises from classes as homework
3. Clients complete homework with notes
4. Trainer reviews and provides feedback

### Phase 2 - Workout Logging
1. Track weight lifted per exercise
2. Reps/form improvements
3. Performance metrics over time

### Phase 3 - Client Profile
1. Personal goals
2. Training history
3. Progress charts

### Future Enhancements
- [ ] Video upload/support (动图)
- [ ] Multiple image upload
- [ ] Exercise variations
- [ ] Class schedule calendar
- [ ] Notifications
- [ ] Mobile app

---

## 🔍 Important Notes

### Row Level Security (RLS)
- Trainers can only see their created exercises
- Trainers can see all classes they created
- Clients see trainers' classes assigned to them + their own
- Notes are visible to both trainer and client

### Headers Required
All API calls include these headers (the client-side code handles this):
```
x-user-id: [user id]
x-user-role: TRAINER or CLIENT
x-user-name: [user name]
```

### Field Flexibility
All parameters (sets, reps, weight, duration) are optional per exercise instance. This allows flexibility:
- Some exercises might only track reps
- Some only duration
- Some weight + reps
- Mix and match as needed

---

## 🐛 Troubleshooting

If you see 404 errors:
1. Verify SQL schema ran successfully in Supabase
2. Check user role is set correctly (TRAINER or CLIENT)
3. Check user is authenticated

If notes don't appear:
1. Verify `exercise_note` table exists
2. Check RLS policies are enabled
3. Clear browser cache and reload

---

## 📞 Questions?
This system is designed with exercises as the core asset. Everything flows from exercises:
- Classes use exercises
- Homework assigns exercises  
- Notes improve exercises
- Clients learn through exercises

This structure encourages learning and independence! 🎯
