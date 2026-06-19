# Security Audit Report: Sajiku — UMKM Digital Ordering System

## 1. Security Overview

| Area | Status |
|---|---|
| Authentication | ✅ Supabase Auth with session management |
| Authorization | ✅ 4-layer security (Middleware → Server Actions → RLS → DB Constraints) |
| Input Validation | ✅ Zod schemas on all server actions |
| SQL Injection | ✅ Supabase JS Client (parameterized queries) |
| CSRF | ✅ SameSite cookies + Server Action session validation |
| XSS | ✅ React auto-escaping, no dangerous HTML |
| Secrets | ✅ .env.example only, no secrets committed |
| Rate Limiting | ⚠️ App-level not implemented (relies on Supabase + Vercel limits) |
| Data Protection | ✅ Immutable payment records, server-computed totals |
| Audit Trail | ✅ Immutable DB records for orders, payments |

## 2. Findings

### F-001 (Low): No application-level rate limiting
- **Description**: Public order creation endpoint has no explicit rate limiting beyond what Vercel/Supabase provide by default
- **Risk**: Anonymous users could theoretically spam order creation
- **Recommendation**: Add rate limiting via Vercel WAF rules or middleware layer
- **Mitigation in MVP**: Low risk for single UMKM; Vercel free tier has built-in DDoS protection

### F-002 (Low): Payment code is the only identifier for Pembeli orders
- **Description**: Pembeli order lookup uses only the payment_code, which is a 6-char alphanumeric
- **Risk**: Someone could guess another customer's order code (2.1B combinations)
- **Recommendation**: Acceptable for MVP since codes expire after payment; add time-based expiry for unpaid orders in future
- **Mitigation in MVP**: Codes are unique, expire after Dibayar, 6-char provides sufficient entropy for single UMKM

### F-003 (Informational): Kasir accounts use email-based auth with constructed emails
- **Description**: Kasir login uses `{username}@sajiku.local` as email with Supabase Auth
- **Risk**: If someone discovers the email pattern, they know the login format
- **Recommendation**: Switch to phone-based auth or custom auth provider in future; acceptable for MVP
- **Mitigation in MVP**: Password is still required; username uniqueness is enforced

## 3. Severity Matrix

| Severity | Count | Findings |
|---|---|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 2 | F-001, F-002 |
| Informational | 1 | F-003 |

## 4. Detailed Review

### 4.1 Authentication
- **Mechanism**: Supabase Auth with `@supabase/ssr` for session management
- **Session**: httpOnly cookie, refreshed via proxy middleware
- **Password**: Handled by Supabase Auth (bcrypt hashing)
- **Protected routes**: Middleware redirects unauthenticated users from /dashboard/* to /login
- **Public routes**: /, /order/* are accessible without auth (intended for Pembeli)
- **Verdict**: ✅ Secure

### 4.2 Authorization (4-Layer)
```
Layer 1: Next.js Proxy (middleware)
  - Redirects to /login if no session on dashboard routes
  - Protects all /dashboard/* routes

Layer 2: Server Action role check
  - requireRole([ROLES.PENJUAL]) or requireRole([ROLES.KASIR])
  - Returns 401/403 if unauthorized
  - Every mutation action has explicit role check

Layer 3: Route Handler access
  - Reports use requireRole([ROLES.PENJUAL])

Layer 4: Row Level Security (PostgreSQL)
  - menu_items: public SELECT active, penjual ALL
  - orders: penjual ALL, kasir SELECT Siap, public INSERT
  - order_items: penjual ALL, kasir SELECT for Siap orders, public INSERT
  - payments: kasir INSERT, penjual SELECT
  - users: penjual ALL
```
- **Verdict**: ✅ Comprehensive

### 4.3 Input Validation
- **Zod schemas**: menuItemSchema, createOrderSchema, createKasirSchema
- **Server-side only**: Validation runs in Server Actions before any DB operation
- **Type coercion**: Prices use `z.coerce.number()` to handle FormData
- **Edge cases**: Min/max lengths, positive integers, required fields
- **Verdict**: ✅ Correct

### 4.4 SQL Injection
- All database queries use Supabase JS Client methods (`.select()`, `.insert()`, `.update()`, etc.)
- No raw SQL construction with user input
- **Verdict**: ✅ Not vulnerable

### 4.5 CSRF
- Server Actions in Next.js have built-in CSRF protection
- Supabase cookies use SameSite=Lax
- No custom fetch-based API calls for mutations
- **Verdict**: ✅ Protected

### 4.6 XSS
- React 19 auto-escapes all JSX expressions
- No `dangerouslySetInnerHTML` usage
- No user-rendered HTML anywhere in the app
- **Verdict**: ✅ Not vulnerable

### 4.7 Secrets Management
- `.env.example` committed with placeholder values only
- No `.env.local` committed (in .gitignore by default in Next.js)
- Supabase service_role key used only in server-side `createKasir` (admin.createUser)
- **Verdict**: ✅ Secure

### 4.8 Data Protection (Financial)
- **Order totals**: Computed server-side from menu_items prices × qty — never from client
- **Payments**: INSERT-only, never UPDATE or DELETE
- **Payment records**: Store kasir_id, amount, timestamp — complete audit trail
- **Order prices**: Denormalized into order_items at time of order (historical accuracy)
- **Verdict**: ✅ Secure

### 4.9 RLS Policy Review

```sql
-- menu_items: Public can read available items only
-- Penjual has full access
-- Kasir has no access (not needed)

-- orders: Penjual sees all
-- Kasir sees only Siap (for payment)
-- Public can INSERT (create order)
-- Penjual can UPDATE any order
-- Kasir can UPDATE only Siap → Dibayar

-- order_items: Same pattern as orders

-- payments: Kasir can INSERT only
-- Penjual can SELECT only
-- No DELETE/UPDATE allowed

-- users: Penjual can do all operations

-- Realtime: orders table subscribed for dashboard auto-refresh
```
- **Verdict**: ✅ Correctly scoped per role. No excessive permissions.

### 4.10 OWASP Top 10 Assessment

| OWASP Category | Status | Notes |
|---|---|---|
| A01: Broken Access Control | ✅ | 4-layer auth + RLS |
| A02: Cryptographic Failures | ✅ | All passwords hashed by Supabase |
| A03: Injection | ✅ | Parameterized queries |
| A04: Insecure Design | ⚠️ Low | Rate limiting not implemented |
| A05: Security Misconfiguration | ✅ | No exposed debug endpoints |
| A06: Vulnerable Components | ✅ | All packages latest |
| A07: Auth Failures | ✅ | Session management correct |
| A08: Integrity Failures | ✅ | No unverified data |
| A09: Logging Failures | ⚠️ Low | App-level audit only via DB |
| A10: SSRF | ✅ | No external URL fetching |

## 5. Recommendations

| Priority | Recommendation | Effort |
|---|---|---|
| Low | Add rate limiting middleware for public endpoints (2 orders/min per IP) | 1 day |
| Low | Add Web Application Firewall (WAF) rules on Vercel for production | 1 hour |
| Info | Consider Supabase phone auth for kasir accounts in future | Future |
| Info | Add payment code TTL (expire unpaid codes after 24h) | Future |

## 6. Release Decision

**Security Assessment**: ✅ **PASS** — No critical or high findings.

| Gate | Status |
|---|---|
| Critical findings | 0 ✅ |
| High findings | 0 ✅ |
| Medium findings | 0 ✅ |
| Low findings | 2 (accepted for MVP) |
| **Release Approved** | **✅ YES** |
