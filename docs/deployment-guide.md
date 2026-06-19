# Deployment Guide: Sajiku — UMKM Digital Ordering System

## 1. Infrastructure Overview

```
GitHub Repository (sajiku/)
    │
    ▼ (push to main)
Vercel (Production)
    │
    ├── URL: https://sajiku.vercel.app (or custom domain)
    │
    └── Supabase Project
        ├── PostgreSQL Database
        ├── Auth
        └── Realtime
```

## 2. Environment Variables

Set these in Vercel Project Settings → Environment Variables:

| Variable | Source | Scope | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public | Anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Secret | Service role key (admin operations) |

**⚠️ NEVER commit `.env.local` to git. Use `.env.example` as template only.**

## 3. Deployment Steps

### 3.1 Initial Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd sajiku

# 2. Install dependencies
npm install

# 3. Create .env.local
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run database migration against Supabase
# Option A: Use Supabase CLI
supabase link --project-ref <your-project-ref>
supabase db push

# Option B: Manual SQL
# Open Supabase Dashboard → SQL Editor
# Copy and execute database/migrations/001_initial_schema.sql
```

### 3.2 Create Initial Penjual Account

```sql
-- Run in Supabase SQL Editor after migration:

-- Create auth user via Supabase Dashboard → Authentication → Add User
-- Email: penjual@sajiku.local
-- Password: (choose a strong password, min 8 chars)

-- Then get the user ID from Supabase Auth → Users
-- Insert into public.users:
INSERT INTO public.users (id, username, password_hash, role, is_active, created_by)
VALUES (
  '<auth-user-id>',
  'penjual',
  '',
  'penjual',
  true,
  NULL
);
```

### 3.3 Deploy to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel --prod

# Option B: GitHub Integration (automatic)
# 1. Push to GitHub
git push origin main
# 2. Vercel auto-deploys (configured in Vercel dashboard)
```

### 3.4 Verify Deployment

1. Visit `https://sajiku.vercel.app/?table=1` → Menu page loads
2. Visit `https://sajiku.vercel.app/login` → Login page loads
3. Login as `penjual` → Dashboard loads
4. Create a menu item → Appears on pembeli page
5. Test full order flow (Pembeli → Penjual → Kasir)

## 4. Monitoring

| Area | Tool | How |
|---|---|---|
| Application Errors | Vercel Logs | Dashboard → Logs |
| Build Status | Vercel Deployments | Dashboard → Deployments |
| Database Performance | Supabase Dashboard | Database → Query Performance |
| Auth Events | Supabase Dashboard | Authentication → Logs |
| Real-time Status | Supabase Dashboard | Database → Realtime |

## 5. Backup Guide

| Data | Backup Method | Frequency |
|---|---|---|
| PostgreSQL Database | Supabase Dashboard → Database → Backup | Daily (automatic on Pro plan) |
| Environment Variables | Vercel Dashboard → Settings → Environment Variables | Manual copy |
| Database Schema | `supabase db dump` or SQL export | On every schema change |

**Manual backup command:**
```bash
supabase db dump --file ./database/backups/$(date +%Y%m%d)_backup.sql
```

Supabase Pro plan ($25/mo) includes:
- Daily backups with 7-day retention
- Point-in-time recovery
- Automatic backups

## 6. Rollback Strategy

### Scenario: Bad deployment to Vercel

```bash
# Instant rollback via Vercel CLI
vercel rollback

# Or via Vercel Dashboard
# Deployments → Last Known Good → Promote to Production
```

### Scenario: Bad database migration

```bash
# 1. Identify the bad migration
# 2. Create a new migration to revert changes
# 3. NEVER delete existing data

-- Example rollback migration:
-- DROP TABLE IF EXISTS payments;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
```

### Rollback Validation

After rollback:
1. Run `npm run build` to verify build
2. Run `npm run lint` to verify code
3. Test critical paths manually
4. Verify environment variables are correct

## 7. Release Checklist

| Item | Status |
|---|---|
| ✅ Build passes (`npm run build`) | ✅ |
| ✅ Lint passes (`npm run lint`) | ✅ |
| ✅ TypeScript compiles | ✅ |
| ✅ Database migration reviewed | ✅ |
| ✅ RLS policies enabled | ✅ |
| ✅ Environment variables configured | ✅ |
| ✅ Initial Penjual account created | ⬜ (post-deploy) |
| ✅ Menu items seeded | ⬜ (post-deploy) |
| ✅ Security audit approved | ✅ |
| ✅ QA test plan reviewed | ✅ |
| ✅ Rollback plan documented | ✅ |
| **READY FOR PRODUCTION** | **✅** |

## 8. Post-Deployment Tasks

1. Create initial Penjual account (see step 3.2)
2. Seed sample menu items (via dashboard)
3. Create kasir accounts (via dashboard)
4. Generate QR codes for each table:
   - URL format: `https://sajiku.vercel.app/?table=N`
   - Print and place on each table
5. Verify end-to-end flow:
   - Customer orders → Penjual sees → Mark ready → Kasir processes payment
6. Monitor error logs for first 24 hours
