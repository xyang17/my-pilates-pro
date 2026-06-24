# MyPilatesPro — Quick Start (Next.js + Supabase)

Get your project running locally in 20 minutes.

---

## Prerequisites

Install these first (free):
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **Code editor** — VS Code recommended ([code.visualstudio.com](https://code.visualstudio.com))
- **Supabase account** — [supabase.com](https://supabase.com) (free)

---

## Part 1: Set Up Supabase Project

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Click **Start your project**
2. Sign up with email or GitHub
3. Create a new project:
   - **Project Name**: `my-pilates-pro`
   - **Database Password**: Create a strong one (save it!)
   - **Region**: Pick closest to you
   - Click **Create new project**
4. Wait 2-3 minutes for it to initialize

### Step 2: Copy Your Credentials

In Supabase dashboard:
1. Go to **Settings** → **API** (sidebar)
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Public Key**
   - **Service Role Key** (keep secret!)

Keep these handy for Step 5.

### Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor** (sidebar)
2. Click **New Query**
3. Paste the entire contents of `06_DATABASE_SCHEMA_SUPABASE.sql`
4. Click **Run**

Wait for it to complete. You should see "All done!" at the bottom.

### Step 4: Set Up Row-Level Security (RLS)

1. In Supabase, **SQL Editor** → **New Query**
2. Paste the entire contents of `07_SUPABASE_RLS_POLICIES.sql`
3. Click **Run**

This locks down data so clients only see their own info.

---

## Part 2: Create Next.js Project

### Step 5: Initialize Next.js

```bash
npx create-next-app@latest my-pilates-pro \
  --typescript \
  --tailwind \
  --app \
  --no-eslint \
  --no-src-dir

cd my-pilates-pro
```

### Step 6: Install Supabase Dependencies

```bash
npm install @supabase/supabase-js
```

### Step 7: Create `.env.local`

In your project root, create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace with your actual values from Step 2.

⚠️ Add `.env.local` to `.gitignore` so secrets don't leak to GitHub.

### Step 8: Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side queries with elevated permissions
import { createClient as createServerClient } from '@supabase/supabase-js'

export const supabaseServer = createServerClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: get current authenticated user
export async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error)
    return null
  }

  return user
}
```

### Step 9: Create Project Folder Structure

```bash
# Create main folders
mkdir -p app/{auth,client,admin,api}
mkdir -p components/{shared,forms,cards,layout}
mkdir -p lib types docs

# Create empty files
touch lib/validators.ts lib/constants.ts
touch types/index.ts
```

---

## Part 3: Test the Setup

### Step 10: Create Test Page

Create `app/test/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    const test = async () => {
      try {
        const { count, error } = await supabase
          .from('class')
          .select('*', { count: 'exact', head: true })

        if (error) throw error

        setStatus(`✅ Connected to Supabase! Found ${count} classes.`)
      } catch (error: any) {
        setStatus(`❌ Connection failed: ${error.message}`)
      }
    }

    test()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>MyPilatesPro — Connection Test</h1>
      <p style={{ fontSize: '1.2rem' }}>{status}</p>
    </div>
  )
}
```

### Step 11: Start Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000/test`

**You should see a green checkmark!** If not, check:
- Supabase credentials in `.env.local`
- Database tables were created (check Supabase SQL Editor)
- RLS policies were applied

---

## Part 4: Deploy to Vercel

### Step 12: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Next.js + Supabase setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-pilates-pro.git
git push -u origin main
```

### Step 13: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Import Project**
3. Select your GitHub repo
4. Add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
5. Click **Deploy**

Vercel will deploy automatically whenever you push to GitHub.

---

## Testing Your Database

### View Data in Supabase

1. Go to your Supabase project
2. Click **Table Editor** (sidebar)
3. You can browse, edit, and add data directly

### Run Queries in Supabase

1. Go to **SQL Editor**
2. Write SQL to test:

```sql
SELECT * FROM "user" LIMIT 10;
SELECT * FROM class ORDER BY date_time;
SELECT COUNT(*) FROM booking WHERE status = 'CONFIRMED';
```

---

## Troubleshooting

### "Environment variables not working"
- Make sure `.env.local` is in your project root
- Restart dev server: `npm run dev`
- Vercel: redeploy after adding environment variables

### "RLS policy error"
- Check RLS policies were created (Supabase → Database → Policies)
- Policies should be enabled by default

### "Can't authenticate users"
- Supabase Auth is enabled by default
- Users are created in `auth.users` table automatically
- You may need to create matching rows in your `user` table

### "Port 3000 in use"
```bash
lsof -ti :3000 | xargs kill -9
npm run dev -- -p 3001  # Use different port
```

---

## Next Steps

You now have:
✅ Supabase database with 10 tables  
✅ Row-level security enforcing privacy  
✅ Next.js project connected to Supabase  
✅ Local dev server running  
✅ Deployed to Vercel  

**Ready to build features!** I can help you create:

1. **Login/Signup** (Supabase Auth)
2. **Client dashboard** (list upcoming bookings)
3. **Class booking system** (core feature)
4. **Admin class management**
5. **Workout logging**

Which feature would you like to start with?

---

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Run production build

# Testing
# Visit http://localhost:3000/test to check database connection

# Deployment
git push                       # Auto-deploy to Vercel

# Cleanup
rm -rf .next node_modules     # Clean build
npm install                    # Reinstall dependencies
```

---

## Project Architecture

```
Frontend (Vercel)
    ↓ (via HTTPS)
Next.js App (Vercel)
    ↓ (API calls)
Supabase (Free Tier)
    ├── PostgreSQL Database (10 tables)
    ├── Auth (login/signup)
    ├── RLS Policies (security)
    └── Real-time subscriptions (optional)
```

You're all set! 🚀
