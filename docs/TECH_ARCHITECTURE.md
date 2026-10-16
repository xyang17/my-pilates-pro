# MyPilatesPro — Technical Architecture & Decision Log

**Last Updated:** October 16, 2026  
**Status:** Core Feature Phase — Live at myfitnesspro.co  
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

## Updates Log

### June 28, 2026 — Core Feature Sprint Complete

#### 新增功能（本轮开发）

**1. 全局中英文切换系统**
- 新建 `context/LanguageContext.tsx`，提供 `useLang()` hook 和 `t(zh, en)` helper
- 语言偏好存入 `localStorage`（key: `mfp_lang`），刷新/重开后保持
- Dashboard 底部悬浮按钮 `中文 / EN` 切换，通过 `app/dashboard/layout.tsx` 实现全局覆盖
- 所有 Dashboard 页面已接入（dashboard, exercises, classes, calendar, clients, profile, workouts）
- 数据库双语字段（name_cn/name_en 等）根据语言显示对应内容

**2. 动作库重设计（Exercise Library）**
- 从网格卡片改为**列表视图**，信息密度更高
- 分类 Tab（全部 / 普拉提核心床 / 普拉提垫上 / 抗阻训练）从数据动态生成
- 新增**难度下拉筛选**（初级 / 中级 / 高级）
- 新增**肌群下拉筛选**（从数据库 target_muscles 字段拆分，自动去重排序）
- 搜索 + 分类 + 难度 + 肌群四重筛选联动
- 未设置分类的动作归入「其他 Other」

**3. 动作批量导入修复**
- 从 CDN 加载 xlsx 改为 npm 包（`npm install xlsx`），解决中国网络环境 CDN 不稳定问题
- 修复 API 返回格式不一致导致的前端崩溃（`{count, exercises}` → `{created, failed, errors}`）
- 支持双格式列名：snake_case (`type_en`) 和 camelCase (`typeEN`) 同时兼容
- 导入时自动从 master_exercise 读取默认参数（default_sets/reps/weight）填充 class_exercise_instance
- 新增拖拽上传、文件预览（前3行）、逐行导入并收集错误报告

**4. 课程动作计划——电子表格式内联编辑**
- 旧流程：添加动作 → 找到 → 确认 → 再点编辑 → 改参数 → 保存（5+ 步）
- 新流程：搜索框输入 → 点击标签直接加入（自动填入默认值）→ 直接在格子里改数字（失焦自动保存）
- 每行始终显示：组数 / 次数 / 配重+单位 / 备注，无需进入编辑模式
- 底部常驻快速搜索栏，搜索结果以标签形式展示（显示默认参数预览，如 `3×12`）
- 已加入的动作不再出现在建议列表
- 自动保存：`onBlur` 触发 PUT API，只在内容改变时才发请求，后台静默保存

**5. 课后作业模块（Homework）**
- 新表：`public.homework`（作业主表）+ `public.homework_exercise`（作业动作）
- 课程详情页「📋 布置作业」按钮（教练可见，有动作时显示）
- 底部弹窗：勾选课程动作（带参数预览） + 填写截止日期 + 备注 + 指定学员
- API: `POST /api/homework`（创建）、`GET /api/homework`（列表）、`GET/PATCH /api/homework/[id]`
- 作业列表页 `/dashboard/workouts`：学员查看作业，展开看动作详情，可标记完成/撤销
- 教练看到自己布置的所有作业记录

**6. 新建学员功能**
- 客户列表页「+ 新建学员」弹窗
- 包含：姓名、邮箱、密码（带 👁 显示/隐藏切换）、手机号（含国家区号下拉：+86/+1/+44/+81 等）
- 调用 `/api/auth/signup` 创建 Supabase Auth 用户

**7. 其他页面补全**
- `/dashboard/profile`：头像（首字母）、姓名、角色徽章、基本信息、退出登录
- `/dashboard/schedule`：自动重定向至 `/dashboard/calendar`
- `/dashboard/workouts`：课后作业列表（现已有内容）
- `/dashboard/calendar`：月历视图，点击日期看当天课程，底部月度概览
- `/dashboard/clients`：学员列表 + 搜索
- `/dashboard/clients/[id]`：学员详情（头像、统计、课程历史）
- `/dashboard/trainers/[id]`：教练主页（证书、简介、课程列表）

---

#### 本轮学到的流程经验

**Excel 导入兼容性**
Excel 的列名可能是 camelCase（`typeEN`）或 snake_case（`type_en`），后端 API 必须同时处理两种格式，否则数据会丢。标准写法：
```ts
type_en: ex.type_en || ex.typeEN || ex.type || ''
```

**数据库数据清理流程**
发现数据库有脏数据时，先 `SELECT` 确认范围，再 `DELETE`。不要盲目删除：
```sql
-- 先确认
SELECT COUNT(*), type_en FROM public.master_exercise GROUP BY type_en;
-- 确认后再删
DELETE FROM public.master_exercise WHERE (type_en IS NULL OR type_en = '');
```

**表格式内联编辑的状态管理模式**
对于需要每个字段单独 auto-save 的场景，用 `localParams: Record<id, fields>` 存本地编辑状态，`onBlur` 比较改前改后值，只在有变化时才发 API 请求，避免无效请求：
```ts
const [localParams, setLocalParams] = useState<Record<string, FieldMap>>({})
// onBlur: 比较新旧值，有变化才保存
const saveField = async (ex) => {
  const p = getLocal(ex)
  if (p.sets === (ex.sets?.toString() || '') && /* ... */) return
  await fetch(`/api/classes/${classId}/exercises/${ex.id}`, { method: 'PUT', ... })
}
```

**Git 沙盒限制**
Claude 的沙盒环境对 `.git/` 目录有权限限制（无法创建 HEAD.lock），所有 git 操作必须在 Jessica 的本地终端执行。Claude 只负责写文件，不执行 git 命令。

**SSH 替代 HTTPS（中国网络）**
中国网络环境下 HTTPS 推送 GitHub 经常超时，改用 SSH 更稳定：
```bash
git remote set-url origin git@github.com:xyang17/my-pilates-pro.git
# 生成 key: ssh-keygen -t ed25519 -C "your@email.com"
# 公钥添加到 GitHub Settings → SSH and GPG keys
```

---

#### 已知待处理问题

| 问题 | 状态 | 说明 |
|------|------|------|
| 作业布置学员选择 | 待改进 | 目前用 UUID 输入，需改为从客户列表下拉选择 |
| 动作库重新导入 | 待执行 | 删除旧数据后需重导入37条真实数据（有修复 camelCase 支持后才能正确导入类型） |
| 作业 homework 表 SQL | 待执行 | CREATE TABLE homework + homework_exercise，需在 Supabase 运行 |
| 所有页面中文切换完整性 | 部分完成 | class detail、review、student-notes、exercise detail 等页面还未接入 useLang |

---

---

### July 4, 2026 — 功能迭代 + 数据完整性修复

#### 新增功能

**1. 动作库删除按钮**
- 每行右侧新增 ✕ 按钮，点击后软删除（`is_active = false`），不物理删除数据
- 防误删：点击后立即弹出 `confirm()` 确认，显示动作名称
- 删除中显示加载状态，防止重复点击
- 实现位置：`app/dashboard/exercises/page.tsx` → `ExerciseRows` 组件

**2. 动作系列标签（series）**
- 新增 DB 字段：`master_exercise.series_cn VARCHAR(255)`, `series_en VARCHAR(255)`
- SQL Migration：`ALTER TABLE master_exercise ADD COLUMN IF NOT EXISTS series_cn ..., ADD COLUMN IF NOT EXISTS series_en ...`
- 导入 API（`/api/exercises/import/route.ts`）新增 series 字段映射：
  ```ts
  series_cn: ex.series_cn || ex.seriesCN || null,
  series_en: ex.series_en || ex.seriesEN || null,
  ```
- 动作库页面：每行名称旁显示紫色系列标签（仅当有值时显示）
- 系列筛选下拉：动作库页 + 课程详情页的两个动作选择器（课程动作 / 家庭作业额外动作）
- 新增凯迪拉克初级动作导入表（68条数据，含 series 列）

**3. 手机端触摸拖拽排序**
- 原 HTML5 drag API 在手机触摸屏不工作，触控面积也太小
- 方案：全行触摸触发拖拽（排除 input/select/button），配合 `document.addEventListener('touchmove'/'touchend')` 全局监听
- 目标检测：`document.elementFromPoint(touch.clientX, touch.clientY)` + `data-exercise-id` 属性
- 防止页面滚动：`{ passive: false }` + `e.preventDefault()`
- 实现位置：`app/dashboard/classes/[id]/page.tsx` → `useEffect([draggedId])`

**4. 课程计划字段保存重写（per-field save，见下方决策详解）**
- 彻底修复"填好的数字消失"bug
- 新增手动 💾 保存按钮（当有未保存改动时显示绿色按钮）
- 离开页面警告（浏览器 beforeunload + 返回按钮 confirm 对话框）
- 复制课程时携带当前本地未保存的值（`getLocal(ex)` 而非直接用 `ex`）

---

#### ⭐ 重要决策：课程计划字段保存策略

> **背景：** 课程详情页每个动作都有"组数/次数/配重/备注"等输入框，用户在格子里改完数字需要保存到 DB。这个功能看似简单，但踩了多次坑，最终经过多轮讨论才确定最终方案。以后遇到类似"多行多字段内联编辑 + 自动保存"场景，直接参考此决策。

##### 状态模型

```ts
// 两层数据：DB 数据（classData）和本地编辑状态（localParams）
const [classData, setClassData] = useState<ClassData | null>(null)   // DB 的真实值
const [localParams, setLocalParams] = useState<Record<string, FieldMap>>({}) // 用户正在编辑的临时值

// getLocal：优先用 localParams，fallback 到 DB 值
const getLocal = (ex: ClassExercise) =>
  localParams[ex.id] || {
    sets: ex.sets?.toString() || '',
    reps: ex.reps?.toString() || '',
    weight: ex.weight?.toString() || '',
    weight_unit: ex.weight_unit || 'kg',
    duration: ex.duration?.toString() || '',
    duration_unit: ex.duration_unit || 'minutes',
    instance_notes: ex.instance_notes || '',
  }

// hasUnsaved：比较 localParams 和 classData，判断是否有未保存内容
const hasUnsaved = !!(classData?.exercises.some(ex => {
  const lp = localParams[ex.id]
  if (!lp) return false
  return lp.sets !== (ex.sets?.toString() || '') || lp.reps !== ... // 各字段比较
}))
```

##### 曾经尝试的方案及问题

| 方案 | 描述 | 核心问题 |
|------|------|----------|
| **方案 A：Debounce per-row** | 每行任何字段改动后 350ms 触发保存整行 | 仍有竞争：A 保存飞行中，用户改 B → A 成功后 `delete localParams[ex.id]` 删掉了 B 的值 |
| **方案 B：onBlur 整行保存** | 失焦时保存整行所有字段 | 同上；且 `delete localParams[ex.id]` 时机不对——A 失焦保存完成时，B 字段可能已经输入新值 |
| **方案 C：Server-sent events 实时同步** | 每次 DB 变化推送给前端 | 实现复杂，引入 WebSocket/SSE，杀鸡用牛刀 |
| **方案 D：Zustand/Redux 全局状态** | 用外部状态库管理 | 引入额外依赖，项目规模暂不需要 |

##### ⭐ 最终选择：方案 E — Per-field Save（每字段单独保存）

**核心思路：每个 input 的 `onBlur` 只保存自己那一个字段，API 支持 partial PUT，保存完只更新 classData 对应字段，永远不主动清除 localParams。**

```ts
type ExerciseField = 'sets' | 'reps' | 'weight' | 'weight_unit' | 'duration' | 'duration_unit' | 'instance_notes'

const saveField = async (ex: ClassExercise, field: ExerciseField) => {
  const p = getLocal(ex)
  const current = p[field]
  const dbVal = /* 取 ex[field] 对应的 string 表示 */

  if (current === dbVal) return // 没变化，跳过

  // 仅发送这一个字段
  const res = await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
    method: 'PUT',
    body: JSON.stringify({ [field]: convertedValue }),  // partial PUT
  })

  if (res.ok) {
    // 只更新 classData 中该字段
    setClassData(prev => ({ ...prev, exercises: prev.exercises.map(e =>
      e.id !== ex.id ? e : { ...e, [field]: convertedValue }
    )}))
    // ⚠️ 不动 localParams！hasUnsaved 自动重算：
    // 该字段 localParams 值 === 新的 classData 值 → 不再 dirty
    // 其他字段的 localParams 不受任何影响
  }
}

// 每个 input 的 onBlur 传字段名
<input onBlur={() => saveField(ex, 'sets')} ... />
<input onBlur={() => saveField(ex, 'reps')} ... />
<input onBlur={() => saveField(ex, 'weight')} ... />
<select onBlur={() => saveField(ex, 'weight_unit')} ... />
<input onBlur={() => saveField(ex, 'instance_notes')} ... />
```

**为什么这样不会有竞争问题：**
- 每个字段保存独立，互不干扰
- 字段 A 保存成功后，只影响 classData.A — 不影响 localParams.B, localParams.C 等
- 用户同时编辑多个字段时，每个字段有自己的独立 in-flight 请求
- `localParams` 只会被 `updateLocal`（用户输入）更新，不会被 save 逻辑删除

**API 支持 partial update 的条件（必须满足）：**
```ts
// /api/classes/[id]/exercises/[instanceId]/route.ts
// 只更新显式传入的字段，未传字段保持原值
const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
if (body.sets !== undefined) updates.sets = body.sets
if (body.reps !== undefined) updates.reps = body.reps
// ...
```
> **如果 API 是全量覆盖（overwrite all fields），per-field save 会把未传字段清空！** 改用此模式前必须确认 API 是 partial update。

**saveAll（手动保存按钮）的实现：**
`saveAll` 不调用 `saveField`（避免每字段发一次请求），而是自己对每个 dirty exercise 构建"仅变化字段"的 payload，一次 PUT 搞定：
```ts
const saveAll = async () => {
  for (const ex of dirty) {
    const payload: Record<string, unknown> = {}
    if (p.sets !== dbSets) payload.sets = parseInt(p.sets) || null
    if (p.reps !== dbReps) payload.reps = parseInt(p.reps) || null
    // ... 只加有变化的字段
    await fetch(PUT, JSON.stringify(payload))
    // 更新 classData，不动 localParams
  }
}
```

##### 离开页面警告

```ts
// 浏览器关闭/刷新/历史跳转
useEffect(() => {
  if (!hasUnsaved) return
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [hasUnsaved])

// 应用内"返回"按钮：Link 改为 button
<button onClick={() => {
  if (hasUnsaved && !window.confirm('有未保存的内容，确定离开？')) return
  router.push('/dashboard/classes')
}}>← 返回</button>
```

##### 经验总结

**以后遇到"多行多字段内联编辑 + 自动保存"，直接用 per-field save。检查清单：**
1. API 是 partial update（`if (body.field !== undefined) updates.field = ...`）✅
2. `saveField(ex, fieldName)` 只保存一个字段
3. 成功后只更新 classData 对应字段，**绝不删 localParams**
4. `hasUnsaved` 通过 classData vs localParams 对比自动计算
5. 加 `beforeunload` + in-app 返回按钮的 confirm 防止数据丢失

---

#### 本轮新增的"已知坑"

| 问题 | 原因 | 预防方法 |
|------|------|----------|
| TypeScript `null` vs `undefined` 类型错误 | `ClassExercise` 字段是 `number?`（undefined），但 payload 里是 `number \| null` | 用 `(payload.sets as number \| null) ?? undefined` 做转换 |
| HTML5 drag 手机不工作 | Mobile 浏览器不触发 `dragstart/dragover`，只有 touch 事件 | 用 `onTouchStart` + `document.addEventListener('touchmove', { passive: false })` |
| 复制课程带旧数据 | 复制时直接用 `ex.sets` 等 DB 值，未保存的本地编辑丢失 | 复制前用 `getLocal(ex)` 取本地值，保证复制的是当前显示的值 |

---

### August 25, 2026 — 依赖版本锁定策略

**背景：** 有人质疑技术栈（Next.js 16 + React 19 + Tailwind v4）太新风险高，建议降级。评估后结论是不降级（切换成本远大于收益，且目前遇到的生产 bug 全部是应用逻辑问题，与框架版本无关），但顺带发现 `package.json` 里 `tailwindcss` 和 `@tailwindcss/postcss` 写的是 `^4`（次版本浮动），存在"重装依赖时被动装到未测试过的新版本"的风险，已改为精确版本锁定。

**改动：**
```diff
- "tailwindcss": "^4",
- "@tailwindcss/postcss": "^4",
+ "tailwindcss": "4.3.1",
+ "@tailwindcss/postcss": "4.3.1",
```

**为什么锁精确版本：** `^4` 允许 npm 在 `node_modules`/`package-lock.json` 被清空重建时（换机器、CI 重建、`npm update`）静默装到 4.x 范围内的更新版本，代码没改但依赖已经变了，出问题很难查。锁精确版本后，任何时候重装都保证装出来的是同一个版本。

**核心依赖（`next`、`react`、`react-dom`）本来就已经是精确版本，这次是把 `tailwindcss` 相关的两个补齐，做法一致。**

**什么情况下需要主动升级依赖版本：**

| 情况 | 怎么做 |
|------|--------|
| 官方发布安全补丁（CVE） | 尽快升级，优先级最高 |
| 需要新版本才有的功能 | 评估后升级，升级前后各跑一遍 `npm run build` 确认无破坏性变更 |
| 当前版本某个已知 bug 影响到业务 | 查 changelog 确认修复了，再升级 |
| 纯粹"很久没升级了" | 不必频繁升级，稳定运行优先；每季度看一眼是否有必须升的理由即可 |

**升级流程：**
```bash
npm install tailwindcss@<目标版本> @tailwindcss/postcss@<目标版本>
npm run build   # 确认没有报错
git add -A && git commit -m "升级 tailwindcss 到 <版本>" && git push
```

**不允许发生的情况：** 因为清缓存、重装 `node_modules`，或者装别的包时被动带出新版本——这类"没人决定但版本变了"的升级，正是锁精确版本要防止的。

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

---

## AI Collaboration Workflow (Claude + Jessica)

> **重要：** 以下流程是在实际开发中总结出来的，所有 AI 协作都必须遵守。违反任何一条都会导致部署失败、代码冲突或浪费大量时间。

---

### 一、每次开发新功能前（AI 必须做）

1. **读现有代码** — 开发新模块前，先读相关文件，了解现有数据结构、API 格式、组件命名规范，避免重复造轮子或与旧代码冲突。
2. **确认影响范围** — 修改 API（路径、字段、方法）时，搜索所有调用该 API 的前端文件，一并更新。
3. **检查 TypeScript 类型** — 增加新字段或新角色（如 TRAINER）时，必须同时更新 `types/` 和相关 interface 定义（如 `AuthContext.tsx`）。

---

### 二、数据库改动（SQL Migration 标准模板）

每次给数据库 migration，必须包含以下三部分，缺一不可：

```sql
-- 第1步：建表或加字段
CREATE TABLE IF NOT EXISTS xxx (...);
-- 或
ALTER TABLE xxx ADD COLUMN IF NOT EXISTS yyy TEXT;

-- 第2步：授权（必须包含，否则会报 permission denied）
GRANT ALL ON TABLE public.xxx TO anon, authenticated, service_role;

-- 第3步：明确 RLS 状态（必须显式说明）
ALTER TABLE xxx DISABLE ROW LEVEL SECURITY;
-- 或（如果需要启用）：
ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;
```

**不能只给第1步就结束。**

---

### 三、代码提交流程（Jessica 在 Terminal 执行）

每次修改代码后，按顺序执行：

```bash
# 第1步：本地构建检查（提前发现 TypeScript 错误，避免浪费 Vercel build）
cd /Users/jessica/my-fitness-pro && npm run build

# 第2步：没有报错，再提交并推送（commit + push 必须写在同一条命令）
git add -A && git commit -m "描述本次改动" && git push
```

**AI 给出的 git 命令，commit 和 push 必须在同一行，不能分开。**

---

### 四、部署验证（每次 push 后必做）

1. 去 Vercel → Deployments，确认 **30秒内** 出现新的 build（带本次 commit message）
2. Build 完成后，打开生产页面确认改动生效
3. 如果 30 秒内没有新 build 出现，说明 GitHub webhook 断了 → 参考下方"常见问题"处理

---

### 五、新模块开发原则（避免与旧代码冲突）

| 原则 | 说明 |
|------|------|
| 新页面放新路径 | 例如新增 `/dashboard/classes/[id]/review/`，不修改已有路径 |
| 新 API 用新文件 | 例如新增 `/api/classes/[id]/student-notes/route.ts`，不在旧 route 里加逻辑 |
| 修改旧 API 前先告知 | 修改现有 API 的字段或返回格式，必须先说明影响，再同步更新所有前端调用 |
| 新表不影响旧表 | 数据库加新表/新字段用 `IF NOT EXISTS` / `IF NOT EXISTS`，不动旧表结构 |
| 共用组件不改接口 | 修改 AuthContext、supabase client 等共用文件时，保证向后兼容 |

---

### 六、已知坑（过去踩过，以后避免）

| 问题 | 原因 | 预防方法 |
|------|------|----------|
| Vercel 部署 404 | Framework Preset 设置错误 | 建项目时确认设置为 Next.js，立即推测试 commit 验证 |
| git index.lock | AI 在沙箱里跑 git 命令权限不足 | **所有 git 操作只在 Jessica 的 Terminal 执行** |
| push 后 Vercel 不自动部署 | GitHub webhook 未注册 | 建项目后立即验证：push → 看 Vercel 是否自动触发 |
| permission denied for table | Migration 缺 GRANT 语句 | 每次 migration 都包含三步模板（见上方） |
| 新代码不上线 | staged 但未 commit，或 commit 但未 push | 用一条命令：`git add -A && git commit -m "..." && git push` |
| TypeScript 编译失败 | 新角色/字段未更新类型定义 | 改代码前先检查 interface，push 前先跑 `npm run build` |
| 前端调用 API 报错 | API 路径或参数改了，前端没同步更新 | 改 API 前搜索所有调用方，一并修改 |
| 修改用户角色/权限后页面不生效 | AuthContext 在登录时读取一次角色并缓存在 React state，DB 改动不会自动刷新 | **只要修改了 `public.user` 的 `role` 字段，必须告知用户退出登录再重新登录**，否则前端看到的是旧的角色 |
| 用户角色改了但浏览器还显示旧角色 | 重新登录发生在 DB 改动之前（时序问题）| 确保操作顺序：先完成 SQL 改动并确认 SELECT 结果正确 → 再退出登录 → 再重新登录 |
| `public.user` 表没有对应记录 | 用户通过 Supabase Auth 注册，但 `public.user` 没有对应触发器自动创建行；代码默认 role = 'CLIENT' | 手动注册流程必须同时往 `public.user` 插入记录；或排查确认 signup trigger 存在 |
| Excel 导入字段丢失 | Excel 列名是 camelCase（`typeEN`），但 API 只处理 snake_case（`type_en`），导致 type/difficulty 等字段全部空 | import API 必须同时处理两种格式：`ex.type_en \|\| ex.typeEN \|\| ''` |
| `authenticated` role 读不到 `public.user` | Supabase 默认不授权 `authenticated` role 读 `public.user`，导致角色查询静默返回 null，前端默认 CLIENT | 每个新表建完必须运行 `GRANT ALL ON TABLE public.xxx TO anon, authenticated, service_role` |
| git HEAD.lock 在沙盒里无法删除 | Claude 沙盒对 `.git/` 目录权限不足 | 所有 git 操作（add/commit/push）必须在 Jessica 本地终端执行，Claude 只写文件 |
| CDN 在中国加载失败 | jsdelivr/unpkg 等 CDN 在中国不稳定，动作库 xlsx CDN 导致整个导入页崩溃 | 改用 npm 包：`npm install xlsx`，从 node_modules 导入 |
| **内联编辑字段消失（saveField 全行删除 bug）** | saveField 完成后 `delete localParams[ex.id]`，连带删除了用户在同行其他字段已输入但尚未保存的值 | **改用 per-field save（见下方决策记录）**，saveField 只更新 classData 对应字段，永不主动删 localParams |

---

### 七、Vercel-GitHub 连接验证（初始设置 Checklist）

新建 Vercel 项目时，必须完成以下验证才能开始开发：

- [ ] Framework Preset 设置为 **Next.js**
- [ ] Connected Git Repository 已连接 GitHub 仓库
- [ ] 推一个测试 commit，确认 Vercel Deployments 30秒内自动出现新 build
- [ ] 访问生产 URL，确认页面正常加载（无 404）

**以上四项全部完成才算部署配置完成。**

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

## 2026-10-16 — 「计费课时」口径统一与全路径审计

**背景**：学员详情页把自我练习加进了上课节数（廖一 19 节私教 + 4 节自我练习 → 显示 23 节）。
教练的原话：「一定不要乱加上去了」。满赠提醒、课时包扣减、收入统计全都依赖这个数，
一处算错会连锁错下去。

**口径（唯一定义，在 `lib/classCounts.ts`）**

| 类型 | class_type | 算计费课时？ | 进收入统计？ | 扣课时包？ |
|---|---|---|---|---|
| 私教 | `private` | ✅ | ✅ | ✅ |
| 团课 | `group`（走 `class_enrollment`） | ✅ | ✅ | ✅ |
| 自我练习 | `self_practice` | ❌ | ❌ | ❌ |

**关键实现细节**：自我练习的 `assigned_to` 也是学员本人，所以**不能只按 `assigned_to` 数**
——这正是当初算错的原因。统一用白名单 `.eq('class_type','private')`，
不要用黑名单 `.neq('class_type','self_practice')`：以后再加新的 class_type，
白名单会安全地不计入，黑名单会默默算进去。

**全路径审计（2026-10-16，7 条路径全部复核通过）**

| 路径 | 做法 |
|---|---|
| `lib/classCounts.ts` | `.eq('class_type','private')` + 团课走报名表 ✅ |
| `lib/clientSummary.ts` | `billable = class_type === 'private'` ✅ |
| `app/dashboard/clients/[id]/page.tsx` | 用后端的 `billable_completed`，自我练习单独一栏显示 ✅ |
| `app/api/stats/route.ts` | `scoped()` 统一排除，`scope='store'` 也盖到 ✅ |
| `app/api/dashboard/route.ts` | `scopeOwn()` 统一排除 ✅ |
| `package_balance` 视图 | 扣减子查询里排除 ✅ |
| `lib/lastExercise.ts` | 只取私教 ✅ |

**线上数据验证**：满 20 赠 1 的提醒发生在 2026-10-09，正好是廖一第 20 节**私教**完成时。
如果自我练习被算进去，私教 16 节 + 自我练习 4 节会让它在 09-20 就提前触发。
提醒的时间点本身就证明了计数是对的。

**顺带发现的两个问题（与计数无关，待处理）**
1. 2026-10-13 那节课 `price` 为空且 `pay_per_class = true`，收入统计里按 0 元计，会出现在「待补价格」里。
2. 按次收费的学员拿到赠课后，赠课用不掉：`autoLinkPackage()` 遇到 `pay_per_class = true` 直接返回，
   所以那 1 节赠课会一直挂在账上。需要在发赠课时提示教练，或者让赠课包能覆盖按次收费标记。

**经验教训**：派生计数（每次从 class 表数）比存计数器好，改课删课之后自动跟着对；
但前提是「数什么」只有一个定义。这次的错不是算错，是同一个概念在前端和后端各数了一遍。

---

## 2026-07-05 → 2026-10-16 — 三个半月开发进度总结

**统计**：99 个提交。数据库从 10 张表长到 **42 张表 + 3 个视图**，API 从「规划中」变成 **59 个路由**，
`lib/` 下 20 个共用模块。产品从「普拉提私教工具」变成「私人教练与学员训练管理平台」。

> ⚠️ **本文档上半部分已过期**，读的时候注意：
> - 「Database Schema (10 Tables)」——实际 42 张表，权威来源是 Supabase 控制台，不是这里
> - 「API Endpoints (Planned, Not Yet Built)」——已全部建好，59 个路由，看 `app/api/` 目录
> - 「Deployment Strategy → Current Status: Foundation Phase (Local)」——早已上线 Vercel（myfitnesspro.co）
> - 「Future Roadmap → Phase 1/2/3」——Phase 1、2 基本做完，排期表没更新

---

### 一、功能更新（按主线分）

#### 1. 品牌与定位
| 时间 | 内容 |
|---|---|
| 07-11 | **改名 MyPilatesPro → MyFitnessPro**，产品定位从普拉提专用放宽到通用私教 |
| 08-25 | logo 接入首页/登录/注册/侧边栏/favicon/分享图；最终改用**矢量图标**，不再依赖手动传图片文件 |
| 08-25 | 统一 slogan 为「私人教练与学员训练管理平台」 |

#### 2. 账号与准入
- **邀请码注册**（07-12/13）：注册必须填邀请码，格式 `MFP-TRN/CLT/ADM-XXX-XXX`，三种角色码 + 场馆管理员码；生成与管理权限收紧为 ADMIN 专属
- **注册必填基础信息**（09-02）：性别 / 出生日期 / 身高，为生理周期和体测做数据基础
- **老账号补填**（10-12）：加了性别快速设置入口，不用重新注册

#### 3. 教学主线 —— 课程
- **团课体系**（07-08 ~ 08-12）：课程内容分发给多个学员、报名名单 UI、每个动作的 `client_note`、教练记录页签；后续把「发送」这一步去掉，**加入名单即自动同步课程内容**
- **建课表单重构**（07-08）：形式优先（format-first），私教流程简化，团课强制填名称/门类/难度
- **代课与无学员课程**（08-02/03）：私教和团课都支持代课；课程详情页可直接标记完成/撤销
- **复制课程**（07-10、07-30）：打开时重新读库（避免复制到脏数据），忠实复制所有动作参数，新增价格和时长选项
- **逐节课就地改价格**（10-04）

#### 4. 动作库
- **动作详情页 + GIF 支持**（07-25），与计划/课程双向链接
- **字段扩充**（07-28）：体位、器械设置、提示语、**禁忌症（置顶显示）**、次要肌群；详情页支持内联编辑
- **导入改为按 `name_en` upsert**（07-28），不再重复插入，返回更新条数
- **系列标签与最近动作**（07-19 ~ 07-24）：`type_cn` 作为系列标签，picker 默认显示最近用过的动作（从 `class_exercise_instance` 实时查，不是前端缓存）
- **未填完整的动作对学员隐藏**（08-25）

#### 5. 训练计划
- **创建 / 编辑 / 发布 + 学员浏览页**（07-13）
- **写计划时就地新建动作**（09-09）：临时想加一个动作不用跳出去
- **排序从拖拽改为上下箭头**（09-15），箭头分置序号两侧并放大

#### 6. 身体测试（L0 / L1 数据层）
- 07-13 先做了 `body_assessment`，08-05 **用 L0 基础数据层整个替换掉**（`l0_body_metric` / `l0_field_meta` / `l1_metric` / `l1_result`）
- L0 报告视图 + 权限模型 + **白话小结**（给学员看的人话版本）
- 08-06 手机首页功能入口；体测分教练端和学员端两套视角

#### 7. 约课
- **教练排班 + 会员预约私教时段**（08-12）：`trainer_availability` / `trainer_availability_exception` / `booking` / `booking_rule`，含预约截止时间规则

#### 8. 训练量与记录
- **训练容量**（08-25）：每组明细记录（`exercise_instance_set`），重量/次数逐组存
- **课后复盘分享图片**（08-25）：Canvas 生成，支持中英文切换、动作备注、课后总结突出显示、头部带 logo
- **训练记录导出 PDF**（10-09 教练端，10-12 学员自己也能导）

#### 9. 计时器与连播（工作量最大的一块）
| 时间 | 内容 |
|---|---|
| 09-09 | 训练计时器上线：**声音（Web Audio 合成，不依赖 CDN）+ 颜色 + 震动 + 屏幕常亮**；补充 iOS 静音开关提示 |
| 09-09 | 计时完成**一键记为自我练习**，自动记录并直达该条记录；课程记录加类型筛选与标签 |
| 09-15 | 计时器支持**多动作 + 循环/顺序两种练法**；抽出共用排程引擎 |
| 09-15 | **课后作业连播**：确认页可调顺序/跳过/改练法，播放自动计时与休息，练完回写完成情况 |
| 09-15 | 确认页逐条展开每组与休息，显示精确总时长 |
| 09-20 | **暂停 / 恢复 / 跳过当前组或休息**；暂停态视觉更明显 |
| 09-20 | **训练进度本地存档**（6 小时过期），退出后可选继续上次训练 |
| 09-20 | 跳过或中途结束**记录已完成的零头时间**，训练时长按实际秒数算 |

抽出的共用模块：`workoutEngine.ts`（排程）、`timerKit.ts`（声音/震动/常亮）、
`workoutSession.ts`（本地存档）、`components/WorkoutRunner.tsx`（播放器）。
计时器和作业连播**跑同一套引擎**，不是两份代码。

#### 10. 生理周期
- 09-02 上线：账号性别为女性才显示，本人和教练都能记，日期 + 症状/备注
- 10-09 支持就地修改；10-12 首页加周期卡片（学员端和教练端都有）

#### 11. 站内消息
- 09-20 上线 `notification` 表 + 消息中心
- 触发：学员完成自我练习实时提醒、**预计生理期前一周**提醒、课时满赠达标提醒
- **角色隔离**：`NOTICE_TYPES` 注册表给每种消息标明收件角色，`pushNotification` 查收件人真实角色，不匹配直接拒发

#### 12. 教练个人训练
- 10-03/04：`personal_workout` + `personal_workout_exercise`，教练自己的力量/普拉提训练都能记，支持手动补记
- **导航重构**：教练端按「教学 / 个人训练」分开，四个底栏；**学员端完全不动**

#### 13. 经营数据
- 07-30 统计功能上线：节数/收入统计、教练对比、权限管理、自定义时间段、**客户收入贡献排名**
- 08-12 **价格分离**：经营数据走白名单隔离 + 数据库层授权，不是靠前端藏起来
- 10-04 统计页加细：更多指标、逐节课明细、就地改价格

#### 14. 课时包与满课赠送（10-08 ~ 10-12）
- **课时包**：建包、剩余节数、完成课程自动扣课、**按次收费切换**（`pay_per_class`）
- **收入口径**：按消耗分摊（默认，挂包的课算包的单节均价）vs 按收款
- **满课赠送**：门店默认规则 + **按学员单独设** + 默认不参加；累计达标提醒、一键发放赠课
- **老学员可认历史节数**（`loyalty_base_count`，系统外上过的课也算进累计）
- **小数扣课**（10-12）：90 分钟课扣 1.5 节
- 10-11 修复扣课：尊重显式「按次收费」，且**绝不用购买日期晚于上课日期的包**
- 学员端首页新增「我的课时」：剩余 + 满赠进度，没有就不显示

#### 15. AI 辅助
- 07-10 AI 建议课程主题 + AI 生成课后复盘总结；AI 语言跟随页面语言
- 07-14 **供应商从 Anthropic 换成 Gemini**（免费额度），只改了 `/api/ai/suggest` 一处

#### 16. 双语 i18n
- 日历、作业、登录注册页陆续补齐；存储的「作业」后缀在英文模式下也翻译
- 分享图片支持中英文切换

---

### 二、稳定性修复（值得单独看）

| 时间 | 问题 | 根因 |
|---|---|---|
| 08-03 | 首页空白 | dashboard 接口**表名全错** |
| 08-12 | 未登录白屏 | 没有兜底，改为跳登录页 |
| 08-12 | 「今天」错位 | 服务端时区没按门店时区算 |
| 08-25 | 导入覆盖数据 | 全量覆盖把没填的字段清空 |
| 08-25 | 分享图学员姓名不显示 | 两处 fetch 都漏了 `x-user-role`，403 |
| 08-25 | 分享图换行丢失 | `wrapText()` 没先按 `\n` 切 |
| 09-09 | 计时器数字框「1」删不掉 | 受控 `type="number"` |
| 10-03 | **偶发登录超时** | `onAuthStateChange` 回调里调 supabase → Web Locks 死锁 |
| 10-11 | 登录不稳 | 改走**同源 Supabase 代理** |
| 10-16 | 累计课时把自我练习算进去 | 同一概念前后端各数了一遍 |

---

### 三、经验教训（这三个半月真正学到的）

**1. 触屏拖拽不要用。**
排序功能迭代了三轮：限制只能拖手柄 → 放大手柄触摸区 → 最后**整个换成上下箭头**，
而且箭头不能上下叠在一列（太小容易按错），要分置序号两侧。
教练原话：「不要再拖动了，有点难用」。以后移动端排序**直接上箭头**，不要先试拖拽。

**2. 手机端入口不会自动继承。**
计时器在网页上有、iPhone 上没有——原因不是 iOS 差异，是**手机功能宫格是另一份硬编码列表**。
10-12 又犯了一次（学员桌面侧边栏缺了课程日历/身体测试/动作库三个入口）。
新功能上线前必须同时检查：桌面侧边栏、手机底栏/宫格、教练端、学员端，**四个位置**。

**3. 受控 `type="number"` 会吞按键。**
默认值 1 删不掉，第一版只去掉 `Math.max` 根本没解决。真正的修法三条一起：
`type="text"` + `inputMode="numeric"`、onBlur 不回写、**组件定义移到模块顶层**
（定义在 render 函数里每次都重新挂载，焦点会丢）。

**4. 绝对不要在 `onAuthStateChange` 回调里调 supabase。**
会和 supabase-js 的 Web Locks 抢锁死锁，表现是**偶发**登录超时——最难查的那种。
回调必须同步，角色查询放独立 effect，`loading` 拆成 `!authReady || !roleReady`
（不拆的话教练会被短暂误判成学员）。
这个 bug 从 07-30 加 fallback 到 10-03 找到根因，**中间两个月都在治症状**。
教训：偶发性问题优先怀疑并发/锁，不要加超时兜底糊过去。

**5. 全量覆盖会清空没填的字段。**
动作库导入那次踩过。所有 PUT 改成部分更新：`if (body.x !== undefined) updates.x = ...`，
用 `!== undefined` 区分「没传这个字段」和「显式要置空」。

**6. 派生计数 > 存计数器。**
课时包剩余、累计节数都是每次从 `class` 表数出来的（`package_balance` 视图、`countBillableCompleted()`），
改课删课之后自动跟着对，也可审计。**但前提是「数什么」只有一个定义**——
10-16 那个 bug 不是算错，是同一个概念前端后端各数了一遍。

**7. 枚举判断用白名单，不用黑名单。**
`class_type = 'private'` 而不是 `!= 'self_practice'`。将来再加课型，白名单会安全地不计入，黑名单会默默算进去。
同理：**改 `class_type` 必须同步改数据库 CHECK 约束**，`class_class_type_check` 曾经拦住 `self_practice`，
是靠真实插入测试才发现的。

**8. 敏感数据靠后端隔离，不靠前端不显示。**
价格/经营数据走白名单 + 数据库授权。

**9. 外部依赖要能换。**
AI 从 Anthropic 换到 Gemini 只动了一个文件。提醒音用 Web Audio **合成**而不是加载音频文件——
国内 CDN 不稳，合成的永远不会加载失败。

**10. 大改动先讨论边界，再动手。**
导航重构和课时包都是先把需求边界对齐了才写代码。
「只改教练账户的，客户账户的没变化」这种约束如果等写完才说，就是重做。

**11. 验证成本要分级。**
默认只跑 `tsc --noEmit`；只有新增路由/页面才在沙箱副本里跑完整 `next build`。
曾经因为 `ClassData.class_type` 联合类型漏了 `'self_practice'` 导致 Vercel 构建失败，
而人还在**用旧代码测试**，白找半天问题。**推送后必须确认 Vercel 构建成功再测。**

**12. 依赖版本锁死。**（08-25）
tailwindcss 等锁精确版本，不用 `^`。

---

### 四、当前待办

1. 「按收款」收入口径开关（按消耗分摊已完成）
2. **按次收费的学员拿到赠课后用不掉**——`autoLinkPackage()` 遇到 `pay_per_class` 直接返回
3. 2026-10-13 那节课缺价格，收入统计里按 0 元计
4. 学员列表卡片重新设计（上次上课 / 剩余课时 / 作业情况）
5. 导航剩下的「学员」「我的」两页细化
6. `docs/待执行SQL-满赠起始节数.sql` 需要在 Supabase 手动执行
7. 本文档上半部分（表结构 / API / 部署状态 / 排期）需要重写
8. 延后：单动作进度曲线、总训练量趋势图（等动作库完善后再做）

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

**Last Updated:** October 16, 2026  
**Next Review:** November 16, 2026  
**Status:** Core Features Live — UI Polish + Data Integrity Hardening Phase
