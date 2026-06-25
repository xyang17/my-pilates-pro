# Go Live — MyFitnessPro.co

## What was fixed (done for you)

All the missing API routes have been created:

| Route | Purpose |
|-------|---------|
| `POST /api/auth/signup` | User registration |
| `GET/POST /api/exercises` | List & create exercises |
| `GET/PUT/DELETE /api/exercises/[id]` | Exercise detail & edit |
| `GET/POST /api/exercises/[id]/notes` | Exercise notes |
| `POST /api/exercises/import` | Bulk Excel import |
| `GET/POST /api/classes` | List & create classes |
| `GET/PUT/DELETE /api/classes/[id]` | Class detail & edit |
| `GET/POST/DELETE /api/classes/[id]/exercises` | Add/remove exercises from a class |

---

## Step 1 — Clean up and push to GitHub

Open Terminal, go to your project folder:

```bash
cd ~/my-fitness-pro

# Delete stale build cache
rm -rf .next

# Also delete the old misplaced route file
rm app/exercises/[id]/route.ts
rmdir app/exercises/[id]
rmdir app/exercises

# Commit everything
git add .
git commit -m "Add all missing API routes — ready for deployment"
git push origin main
```

---

## Step 2 — Add Supabase redirect URL

Your live domain needs to be whitelisted in Supabase or logins will fail.

1. Go to [supabase.com](https://supabase.com) → your project
2. **Authentication** → **URL Configuration**
3. Set **Site URL** to: `https://myfitnessproapp.co` (your actual domain)
4. Under **Redirect URLs**, add: `https://myfitnessproapp.co/**`
5. Click **Save**

---

## Step 3 — Deploy on Vercel

**If this is your first time deploying:**
1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **Add New → Project**
3. Select `my-pilates-pro` repo → **Import**
4. Don't change any build settings — Next.js is auto-detected
5. Click **Deploy**

**Add environment variables** (Settings → Environment Variables):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jbnhwtwnydbnfahtwysx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key from `.env.local` |

After adding variables, go to **Deployments → redeploy** (the env vars need a fresh build to take effect).

**If already on Vercel:** just push to main — auto-deploys.

---

## Step 4 — Point your domain to Vercel

**In Vercel:**
1. Settings → Domains → Add → type your domain → Add

Vercel will show you the DNS records to add. It's usually one of these:

```
Type: A      Name: @    Value: 76.76.19.165
Type: CNAME  Name: www  Value: cname.vercel-dns.com
```

**At your domain registrar** (GoDaddy / Namecheap / etc):
- Find DNS Settings
- Add those two records
- Save

DNS takes 5–30 minutes to propagate. Then your site is live.

---

## Step 5 — Test it

Visit: `https://[your-domain]/auth/signup`

Checklist:
- [ ] Sign up creates an account (no error)
- [ ] Login redirects to dashboard
- [ ] Dashboard shows Exercise Library, Class Training cards
- [ ] `/dashboard/exercises` loads (may be empty if no exercises yet)
- [ ] Can create a new exercise
- [ ] Language toggle works

If anything fails, go to Vercel → Deployments → your latest deployment → **Logs** and share the error.

---

## Notes

- The old file `app/exercises/[id]/route.ts` was in the wrong location (not under `/api/`). Delete it as shown in Step 1.
- `.env.local` is gitignored (correct) — Vercel env vars are the production source of truth.
- RLS is disabled on `master_exercise` table (intentional per your schema), so exercises are readable by service role key.
