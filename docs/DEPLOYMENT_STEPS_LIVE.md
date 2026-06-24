# Live Deployment Steps — mypilatespro.co

**Timeline:** 1 week  
**Target:** mypilatespro.co live with bilingual exercise system  
**What ships:** Exercise library + class training + language toggle  

---

## STEP 1: Create Auth Tables in Supabase (15 min)

Go to your Supabase project → **SQL Editor** → Click **New Query**

Paste this entire block and click **Run**:

```sql
-- Create user table
CREATE TABLE "user" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'ADMIN', 'TRAINER')),
  bio TEXT,
  photo_url VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create client table
CREATE TABLE client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  emergency_contact VARCHAR(255),
  injury_notes TEXT,
  goals TEXT
);

-- Create indexes
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_client_user_id ON client(user_id);

-- Enable RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE client ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own profile" ON "user"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON "user"
  FOR UPDATE USING (auth.uid() = id);

-- Client policies
CREATE POLICY "Clients can view their own data" ON client
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Clients can update their own data" ON client
  FOR UPDATE USING (user_id = auth.uid());
```

✅ **Expected:** You see "All done!" at bottom. If error, check syntax.

---

## STEP 2: Test Locally (20 min)

```bash
# Make sure .env.local exists with Supabase credentials
cd my-pilates-pro

# Start dev server
npm run dev

# Visit http://localhost:3000/dashboard/exercises
```

✅ **Verify:**
- [ ] Page loads (no 404)
- [ ] See all 37 exercises listed
- [ ] Can click on an exercise → details page opens
- [ ] Language toggle (🇬🇧 EN / 🇨🇳 中文) works
- [ ] Can click Edit → form opens
- [ ] No red console errors (F12)

If any fail, **STOP** and tell me the error.

---

## STEP 3: Push to GitHub (10 min)

```bash
# From project root
git status
# Should show modified files (not .env.local - that's in .gitignore)

git add .
git commit -m "Production ready: bilingual exercise system MVP"
git push origin main
```

✅ **Verify:** Go to GitHub repo → see your commit

---

## STEP 4: Set Up Vercel (10 min)

**If you haven't created a Vercel project yet:**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New** → **Project**
4. Select `my-pilates-pro` repo
5. Click **Import**

**Whether new or existing project:**

1. Go to your project on Vercel
2. Click **Settings** (top menu)
3. Go to **Environment Variables** (left sidebar)
4. Add these 3 variables:

| Key | Value | Where to find |
|-----|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase → Settings → API |

5. Click **Save**

6. Go to **Deployments** (top menu)
7. Click the three dots on `main` branch → **Redeploy**
8. Wait for build to complete (2-3 min)

✅ **Verify:** Deployment shows green checkmark ✓

---

## STEP 5: Point Domain to Vercel (5 min setup + 5-10 min DNS propagation)

**In Vercel:**
1. Click **Settings** (top menu)
2. Go to **Domains** (left sidebar)
3. Under "Production Domain", click **Add**
4. Type: `mypilatespro.co`
5. Click **Add Domain**

**Vercel will show you DNS records to add.** Look like this:
```
Type: CNAME
Name: www (or your subdomain)
Value: cname.vercel-dns.com
```

OR

```
Type: A
Name: @ (root)
Value: 76.76.19.165
```

**Go to your domain registrar** (where you bought mypilatespro.co):
- GoDaddy? Namecheap? Google Domains? etc.
- Find **DNS Settings** or **Manage DNS**
- Add the records Vercel told you to add
- Save

✅ **Verify:** Wait 5-10 minutes, then:
```bash
# In terminal, check DNS propagated
nslookup mypilatespro.co
# Should show Vercel IP address
```

Or just go to `https://mypilatespro.co` in browser. If it works, you're done!

---

## STEP 6: Test Live Site (15 min)

Visit `https://mypilatespro.co/dashboard/exercises`

✅ **Checklist:**
- [ ] Page loads (no 404, no timeout)
- [ ] All 37 exercises visible
- [ ] Exercise cards show: type, difficulty, muscles
- [ ] Click an exercise → detail page opens
- [ ] Language toggle works (EN ↔ 中文)
- [ ] Click Edit → form opens with bilingual fields
- [ ] Can edit an exercise and save
- [ ] Search works (type "plank" → filters exercises)
- [ ] No red errors in console (F12)

---

## STEP 7: Check Vercel Logs if Anything Breaks (5 min)

If something doesn't work:

1. Go to Vercel dashboard
2. Click **Deployments** 
3. Click latest deployment (should be green ✓)
4. Click **Logs** (right side)
5. Look for red error messages
6. Tell me the error

---

## You're Live! 🚀

**mypilatespro.co is now running your bilingual exercise system.**

### Next Week (Phase 2):
- Add login/signup page (optional, not MVP)
- Add booking system (optional, not MVP)
- Gather feedback from real users

### For Now:
- Test with your clients
- Tell them new site is live
- Get feedback on exercises + language toggle

---

## If You Get Stuck

**Common issues:**

| Problem | Fix |
|---------|-----|
| "404 not found" on mypilatespro.co | DNS hasn't propagated yet. Wait 10 more min and refresh. |
| "Can't connect to Supabase" on live site | Check Vercel env vars are set (not local .env.local). Redeploy. |
| "RLS permission denied" | Expected during migration. Ignore for now. |
| Vercel build fails | Check GitHub commit pushed successfully. Check Vercel Logs. |
| Exercises don't show | Check Supabase has 37 exercises in `master_exercise` table. |

---

## Timeline Summary

- **Supabase setup:** 15 min
- **Local test:** 20 min
- **GitHub push:** 10 min
- **Vercel setup:** 10 min
- **Domain setup:** 5 min + 10 min wait
- **Live test:** 15 min

**Total: ~90 minutes (1.5 hours)**

---

**Ready? Start with STEP 1.**

Come back when you hit any blocker or finish.
