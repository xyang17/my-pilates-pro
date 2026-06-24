# MyPilatesPro — Technical Architecture & Decision Log

**Last Updated:** June 22, 2026  
**Status:** Foundation Phase (Local Development)  
**Project Lead:** Jessica (xyang17)  
**Repository:** https://github.com/xyang17/my-pilates-pro

---

## Executive Summary

MyPilatesPro is a web-based pilates training and class booking system for fitness studios. The app helps trainers manage classes, track client progress, and log workouts, while clients can book classes, view schedules, and follow homework assignments.

**Current Phase:** Foundation complete. Ready for feature development (Phase 1: Auth & Dashboard).

---

## Tech Stack Overview

| Layer | Technology | Version | Why This Choice |
|-------|-----------|---------|-----------------|
| **Frontend** | Next.js | 14.x | Built for React, file-based routing, API routes, great DX, deploys easily to Vercel |
| **UI Framework** | React | 18.x | Component-based, reusable, large ecosystem, TypeScript support |
| **Styling** | Tailwind CSS | Latest | Rapid prototyping, matches brand aesthetic (minimal/clean), no CSS to maintain |
| **Language** | TypeScript | Latest | Type safety, catches bugs early, better IDE support, easier team collaboration |
| **Database** | PostgreSQL (Supabase) | Latest | Robust relational DB, perfect for complex queries (bookings, memberships), row-level security |
| **Auth** | Supabase Auth | Built-in | Free tier, email/password + OAuth ready, integrated with DB, no external service dependency |
| **Hosting** | Vercel + Supabase | Free tiers | Vercel: Next.js native, auto-deploy from GitHub. Supabase: DBaaS, no server to manage |
| **Version Control** | Git + GitHub | — | Industry standard, enables CI/CD, easy collaboration |
| **Cost** | $0/month | — | Everything on free tiers. Scales to paid only at high volume |

### Why NOT These Alternatives

| Alternative | Why Not | Trade-off |
|-------------|---------|-----------|
| Django/Python Backend | Overkill for MVP, slower dev, requires server management | More mature ecosystems but more complex |
| Firebase | Good for rapid MVP, but proprietary lock-in, expensive at scale | Less control over data, can't migrate easily |
| Self-hosted PostgreSQL | Full control but requires DevOps, backups, monitoring | More responsibility, more cost |
| Plain HTML/CSS/JS | Simpler initially but unmaintainable as app grows | Technical debt builds fast |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                           │
│                (Desktop / Tablet / Mobile)                  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  VERCEL (Frontend)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js Application                    │   │
│  │  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  React Pages │  │  API Routes  │              │   │
│  │  │   (Client)   │  │  (Middleware)│              │   │
│  │  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  Auto-deploys on git push (GitHub integration)             │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ REST API (Supabase Client)
               ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (Backend in Cloud)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        PostgreSQL Database (10 tables)              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │  Users   │ │ Classes  │ │ Bookings │           │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤           │   │
│  │  │ Clients  │ │Exercises │ │Workouts  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  │                                                    │   │
│  │  Row-Level Security (RLS) enforces privacy        │   │
│  │  - Clients see only their data                    │   │
│  │  - Trainers see all data in their studio          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Auth (Email/Password + OAuth)               │   │
│  │  Automatic user.id sync with DB                    │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              GITHUB (Version Control)                       │
│  Webhook triggers Vercel auto-deploy on push               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (10 Tables)

### Core Tables

**user** — All people (trainers & clients)
- id, email, password_hash, name, phone, role (CLIENT/ADMIN)
- bio, certificate, photo_url (trainer-only fields)

**client** — Client profiles (extends user)
- id, user_id, date_joined, emergency_contact, injury_notes, goals
- par_q_completed, par_q_answers (JSON), physical_evaluation_notes

### Class Management

**class** — Scheduled classes/sessions
- id, name, description, instructor_id, assigned_trainer_id
- class_type (GROUP/VS_2/VS_1), max_capacity, price
- date_time, duration, location
- is_recurring, recurring_pattern

**booking** — Client bookings for classes
- id, client_id, class_id, status (CONFIRMED/CANCELLED/WAITLISTED)
- booking_date, cancelled_at, cancellation_reason

### Fitness Tracking

**workout_log** — Training sessions (class or homework)
- id, client_id, date, log_type (CLASS_TRAINING/HOMEWORK)
- session_name, notes, status (IN_PROGRESS/COMPLETED)

**exercise_log_item** — Individual exercises within a workout
- id, workout_log_id, exercise_id
- weight, spring_setup, sets, reps, duration, notes, photo_url

**exercise** — The exercise bank (reusable library)
- id, name, description, instructions, category, difficulty
- photo_url, created_by_id

### Payments & Membership

**membership** — What each client has purchased
- id, client_id, plan_type (PREPAID_CLASSES/SINGLE_CLASS)
- total_classes, classes_remaining, expiry_date

**membership_plan** — Available plans for sale
- id, name, description, number_of_classes, price, expiry_days

**payment** — Payment records (tracking only, not processing)
- id, client_id, amount, date, method, description, recorded_by_id

### Configuration

**studio_settings** — App-wide configuration
- cancellation_window_hours, default_class_capacity, send_reminder_emails, etc.

**Security:** Row-Level Security (RLS) policies enforce:
- Clients see only their own data
- Trainers see all clients' data
- System-level enforcement (not reliant on frontend)

---

## Folder Structure & Modularity

```
my-pilates-pro/
│
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Login, signup, logout
│   ├── (client)/                 # Client-only features
│   │   ├── dashboard/
│   │   ├── classes/
│   │   ├── bookings/
│   │   ├── workout-log/
│   │   └── profile/
│   ├── (admin)/                  # Trainer-only admin panel
│   │   ├── dashboard/
│   │   ├── classes/manage/
│   │   ├── clients/
│   │   └── workout-logs/
│   ├── api/                      # Backend routes (API endpoints)
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── classes/
│   │   ├── bookings/
│   │   ├── workouts/
│   │   └── exercises/
│   └── layout.tsx                # Root layout
│
├── components/                   # Reusable React components
│   ├── shared/                   # Navbar, footer, common UI
│   ├── forms/                    # Reusable form components
│   ├── cards/                    # Card/list item components
│   └── layout/                   # Page layout wrappers
│
├── lib/                          # Utility functions
│   ├── supabase.ts               # Database client
│   ├── auth.ts                   # Auth helpers
│   ├── validators.ts             # Input validation
│   └── constants.ts              # App-wide constants
│
├── types/                        # TypeScript types
│   └── index.ts                  # All type definitions
│
├── .env.local                    # Secrets (NOT in git)
├── .gitignore                    # Ignore .env, node_modules, .next
└── package.json
```

**Modularity Principle:** Each feature is in its own folder. Add "messaging" later? Create `/app/(client)/messages/` and `/api/messages/` without touching existing code.

---

## Key Technical Decisions & Rationale

### 1. Supabase Over Custom Backend

**Decision:** Use Supabase (PostgreSQL hosted) instead of building Node.js/Express server  
**Why:** 
- No server to manage or monitor
- Row-Level Security built-in (critical for data privacy)
- Auth integrated with database
- Free tier covers MVP needs
- Can scale to Pro ($25/mo) easily

**Trade-off:** Less control over backend logic, but gains simplicity

### 2. Next.js API Routes Instead of Separate Backend

**Decision:** Use Next.js API routes (`/api/*`) for business logic  
**Why:**
- Single codebase (frontend + backend)
- Easy to deploy (Vercel handles both)
- Can call Supabase directly from API routes
- Simple authentication flow

**When to change:** If app needs real-time features or heavy background jobs, consider separate Node.js backend later

### 3. Optional Login (Guests Can View)

**Decision:** Allow unauthenticated users to see class schedule  
**Why:**
- Marketing advantage (prospects can browse)
- RLS policies prevent data leaks (DB enforces security, not frontend)
- Supabase makes this easy

**Implementation:** Row-level security ensures guests see only public data

### 4. Client-Only Payment Tracking (No Credit Card Processing)

**Decision:** Track payments in database but don't process cards in-app  
**Why:**
- Reduces PCI compliance burden
- Keeps MVP simple
- Payments happen outside (cash, Stripe link, Square)
- App just records "Client paid $50 for 10-class pack"

**Future:** Add Stripe integration later when volume justifies it

### 5. One Primary Trainer Model

**Decision:** Default app is for ONE main trainer with optional secondary trainers  
**Why:**
- Most pilates studios are solo or small team
- Simpler UX than multi-tenant setup
- Can still assign classes to other trainers
- Different from Mindbody/Acuity (multi-studio)

**Trade-off:** Multi-studio setup requires rework, but uncommon for MVP

### 6. Homework vs Class Training Separation

**Decision:** Track workouts as either CLASS_TRAINING or HOMEWORK (separate log types)  
**Why:**
- Clients can do homework on their own schedule
- Trainers see both in one place (progress tracking)
- Reflects real pilates business model
- Allows notes/feedback on homework

---

## API Endpoints (Planned, Not Yet Built)

```
Auth Routes:
  POST   /api/auth/signup              # Client signup
  POST   /api/auth/login               # Client login
  POST   /api/auth/logout              # Logout

Client Routes:
  GET    /api/clients                  # Get all clients (admin only)
  POST   /api/clients                  # Create new client (admin)
  GET    /api/clients/[id]             # Get single client
  PATCH  /api/clients/[id]             # Update client profile

Class Routes:
  GET    /api/classes                  # Get all classes (public)
  POST   /api/classes                  # Create class (admin)
  GET    /api/classes/[id]             # Get class details
  PATCH  /api/classes/[id]             # Update class (admin)
  DELETE /api/classes/[id]             # Delete class (admin)

Booking Routes:
  POST   /api/bookings                 # Book a class (client)
  GET    /api/bookings/[id]            # Get booking details
  PATCH  /api/bookings/[id]            # Update booking (cancel, etc)

Workout Routes:
  POST   /api/workouts                 # Create new workout log
  GET    /api/workouts/[id]            # Get workout details
  PATCH  /api/workouts/[id]            # Update workout

Exercise Routes:
  GET    /api/exercises                # Get exercise bank
  POST   /api/exercises                # Add exercise (admin)

Each endpoint validates with TypeScript types and RLS enforces auth.
```

---

## Authentication Flow

```
1. User visits app → /login page
2. User enters email + password
3. Frontend calls POST /api/auth/signup or login
4. Supabase Auth creates user in auth.users table
5. API creates row in user + client tables
6. Auth token stored in session
7. RLS policies activate: user sees only their data
8. Dashboard loads

On logout:
- Session cleared
- Redirect to login
```

**Key Security:**
- Passwords hashed by Supabase (we never see them)
- Auth token is secure HTTP-only cookie
- RLS enforces at database level (even if frontend hacks the query)

---

## Deployment Strategy

### Current Status: Foundation Phase (Local)
- ✅ Code on GitHub
- ✅ Vercel project created (deployment pending)
- ✅ Environment variables configured
- ⏳ First deployment: When Phase 1 (Auth) is complete

### Deployment Workflow (Future)
```
1. Write code locally (dev server at localhost:3000)
2. Test locally
3. Push to GitHub: git push
4. GitHub webhook notifies Vercel
5. Vercel auto-builds Next.js app
6. Auto-runs tests (when set up)
7. Deploys to vercel.app domain (if tests pass)
8. Live in ~2 minutes
```

### Scaling Plan
- **Month 1-3:** Free tier (Vercel + Supabase)
- **Month 4-6:** Supabase Pro ($25/mo) if >500 active clients
- **Year 1+:** Consider dedicated Vercel plan ($20-100/mo) if >10k requests/day

---

## Future Roadmap & Considerations

### Phase 1 (Next - 2-3 weeks)
- [ ] Supabase Auth integration (signup/login)
- [ ] Client dashboard (upcoming bookings)
- [ ] Basic navigation
- **Deliverable:** Working login + profile page

### Phase 2 (After Phase 1 - 3-4 weeks)
- [ ] Class booking system
- [ ] Class schedule view
- [ ] Admin class management
- **Deliverable:** Full booking flow end-to-end

### Phase 3 (Later - 4-5 weeks)
- [ ] Workout logging (class + homework)
- [ ] Exercise bank
- [ ] Client progress tracking
- **Deliverable:** Complete fitness tracking

### Future Features (Year 2+)
- [ ] Mobile app (React Native/Flutter using same backend)
- [ ] Real-time notifications (Supabase Realtime)
- [ ] Payment processing (Stripe integration)
- [ ] Video library (S3 + streaming)
- [ ] Progress photos upload
- [ ] Referral program
- [ ] SMS reminders

### Known Limitations & Tech Debt
- No offline support (yet) — would need Service Workers
- Real-time updates require subscription setup (not built)
- No image optimization (need Cloudinary or similar)
- Email notifications not yet sent (need SendGrid/Mailgun)
- No CI/CD pipeline yet (should add GitHub Actions)

---

## Development Workflow Best Practices

### Branching Strategy (Git)
```
main               # Production-ready code
└── develop        # Integration branch (test here first)
    └── feature/*  # Individual feature branches
        └── feature/auth-signup
        └── feature/class-booking
        └── feature/workout-logging
```

**Workflow:**
1. Create feature branch: `git checkout -b feature/auth-signup`
2. Work locally, commit often
3. Push: `git push -u origin feature/auth-signup`
4. Create Pull Request on GitHub (request review)
5. After review, merge to `develop`
6. Test on `develop` branch in staging
7. Merge `develop` → `main` when ready for production

### Local Development Checklist
```
Before committing:
☐ Test locally: npm run dev
☐ No console errors
☐ No TypeScript errors: npm run build
☐ Follow component naming (PascalCase for React)
☐ Follow file naming (camelCase for utility files)
☐ Update types if data changed
```

### Code Review Standards (For Future Team)
- Every merge to `main` needs review
- Check: TypeScript types, RLS policies, component reusability
- Test on local instance before approving
- Assign to tech lead if uncertain

---

## Documentation & Knowledge Base

### How to Keep This Doc Updated

**Monthly Sync Pattern:**
- End of each month: 30-min sync with team
- Review what was built, what changed architecturally
- Claude generates summary, add to "Updates" section below
- Commit updated doc to git

**Section to Add Monthly:**
```
## Updates Log

### June 2026
- [Foundation phase complete]
- Database schema finalized
- Vercel + Supabase connected
- Ready for Phase 1

### July 2026
- [Add here after Phase 1 complete]
```

### Onboarding New Team Members

**Day 1:** Read this entire document  
**Day 2:** Local setup + explore folder structure  
**Day 3:** Deploy locally, look at one feature end-to-end  
**Day 4:** Pick first small task, submit PR  

**Essential Files to Review First:**
1. This file (TECH_ARCHITECTURE.md)
2. `/types/index.ts` — All data types
3. `/app/api/clients/route.ts` — Example API endpoint
4. `/components/cards/BookingCard.tsx` — Example component

---

## Environment Variables

```
# Required in .env.local (never commit!)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# For production (Vercel dashboard)
Same as above (set in Vercel project settings)
```

⚠️ **CRITICAL:** Never commit `.env.local` to git. Add to `.gitignore`.

---

## Troubleshooting Guide

| Problem | Solution |
|---------|----------|
| "Can't connect to Supabase" | Check `.env.local` credentials, restart `npm run dev` |
| "RLS policy error" | Check Supabase dashboard → Database → Policies, verify enabled |
| "Page not found" | Check `/app/(client)/` or `/app/(admin)/` folder structure matches URL |
| "Type error" | Run `npm run build` to catch TypeScript errors |
| "Vercel deployment stuck" | Check GitHub Actions logs, verify `git push` succeeded |

---

## Contact & Questions

**Project Lead:** Jessica (xyang17)  
**Tech Decisions:** Document here, discuss with team before major changes  
**Escalations:** When stuck >1 hour, reach out to tech lead or senior dev

---

**Last Updated:** June 22, 2026  
**Next Review:** July 22, 2026  
**Status:** Foundation Complete, Ready for Phase 1 Development
