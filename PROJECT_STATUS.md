# AutoFlow Project Status

**Last updated:** 2026-08-16 22:57 +04  
**API repo:** [ivandioneo/autoflow-api](https://github.com/ivandioneo/autoflow-api)  
**Dashboard repo:** [ivandioneo/autoflow-dashboard](https://github.com/ivandioneo/autoflow-dashboard)  
**Production API:** https://api.autoflow.ivanit.work  
**Production Dashboard:** https://dashboard.autoflow.ivanit.work  
**API server:** CT116 — Docker Compose service `autoflow-api` at `/opt/autoflow-api`  
**Dashboard hosting:** Cloudflare Pages (production branch: `main`)

---

## Architecture Overview

AutoFlow is a multi-tenant business-automation platform consisting of:

- **FastAPI backend** (Python) running in Docker Compose on CT116, served at `api.autoflow.ivanit.work`
- **React dashboard SPA** deployed via Cloudflare Pages at `dashboard.autoflow.ivanit.work`
- **PostgreSQL** database for tenant and config persistence
- **Resend** for transactional email (verification, password reset, booking notifications)

### Authentication Model

| Token | Storage | Transport | TTL |
|-------|---------|-----------|-----|
| Access token (JWT) | In-memory only (React state) | `Authorization: Bearer` header | 15 minutes |
| Refresh token | `autoflow_refresh` HttpOnly, Secure, SameSite=Strict cookie | Cookie (automatic) | Session |

Access tokens are **never written to localStorage, sessionStorage, URLs, or logs**. The API fails at startup if `JWT_SECRET` is missing. There is no fallback JWT secret.

---

## Completed Work (Chronological)

### 1. Initial API — Tenant Auth & IDOR Fix
**Commit:** [`09960bad`](https://github.com/ivandioneo/autoflow-api/commit/09960bad2299b7272d3ab89048174d4b9d4b9218)

- Unauthenticated IDOR on `/tenants` and `/tenants/{id}/configs` fixed
- Auth dependency added, ownership checks enforced, admin-only enumeration, privilege-escalation guards

### 2. Lint, Pytest & Ruff Configuration
**Commits:** [`23163870`](https://github.com/ivandioneo/autoflow-api/commit/23163870f24f27eec65afaa77c943115c2a305e4) · [`bad78203`](https://github.com/ivandioneo/autoflow-api/commit/bad78203340cf3a02e4866b87b026ecf1d8903ac) · [`adef1300`](https://github.com/ivandioneo/autoflow-api/commit/adef1300f79831bca0990b62ad4d4286f3fa129c)

- Ruff linter configured and all violations resolved across auth module and entrypoints
- pytest configured for the project

### 3. HttpOnly Refresh-Cookie Migration
**API PR #1 → [`e3c62f5c`](https://github.com/ivandioneo/autoflow-api/commit/e3c62f5cb354fb157006790e1b41fd32550167c1)**  
**Dashboard PR #2 → [`758364bf`](https://github.com/ivandioneo/autoflow-dashboard/commit/758364bf0638e6323dee5a42253010aec0b90a61)**

- Refresh sessions migrated from localStorage to `autoflow_refresh` HttpOnly, Secure, SameSite=Strict cookie
- Refresh-token rotation hardened; tenant API exposure tightened
- Authorization regression tests added
- Dashboard clears legacy localStorage tokens on failed session restore
- `/auth/me` re-fetched on full app load for server-authoritative tenant data

**Production tested:** login, hard refresh/session restore, no token in localStorage, cookie creation, logout. ✅

### 4. Email Verification Enforcement
**API commit:** [`8e939c3f`](https://github.com/ivandioneo/autoflow-api/commit/8e939c3f2b6a67882851f9cf8bb51a8a0b3a9e42)  
**Dashboard commits:** [`aadb667a`](https://github.com/ivandioneo/autoflow-dashboard/commit/aadb667a9f287a6b0e1eb5cb44f194477997f462) · [`55e512c0`](https://github.com/ivandioneo/autoflow-dashboard/commit/55e512c0b0ed1a96617b09ea13e0078ff0cb2568)

- `POST /register` returns HTTP 202 with a verification-pending message only — **no access token, no refresh token, no Set-Cookie header**
- `POST /refresh` rejects unverified tenants, revokes all sessions, clears cookie
- `get_current_tenant` blocks unverified legacy access tokens on all protected routes
- 8 automated tests in `tests/test_email_verification.py`
- Dashboard: registration shows a persistent verification-pending notice with a resend flow; `register()` no longer calls `saveAccessToken()`
- Dashboard: 403 responses surface the API's actual `detail` message instead of the generic fallback
- Password show/hide toggle added to the login form

**Code audit (2026-08-16):** All layers verified complete in production code — no gaps found. ✅

### 5. Branded Email Verification Page
**API commit:** [`7a08cc61`](https://github.com/ivandioneo/autoflow-api/commit/7a08cc6124a4057a92d1c82c454afd1c7e435698)

- `GET /auth/verify` returns a styled `HTMLResponse` (AutoFlow dark theme) instead of plain JSON
- Four states covered: success, already-verified, invalid link, expired link — each with appropriate icon and copy
- Success and already-verified states include a "Go to sign in" CTA linking to the dashboard login page
- `DASHBOARD_URL` read from env, falls back to production URL

### 6. Password Reset (Self-Service + Admin-Triggered)
**API commit:** [`dd2b9489`](https://github.com/ivandioneo/autoflow-api/commit/dd2b9489ec519c6b44e8077bdb472e64b3d3361d)  
**Dashboard commits:** [`05bd697a`](https://github.com/ivandioneo/autoflow-dashboard/commit/05bd697ade083f19a148d703afdf5369d2c063d9) · [`3a7be826`](https://github.com/ivandioneo/autoflow-dashboard/commit/3a7be826b49f7c868a1cdef1888175707a2b2634)

**API endpoints:**
- `POST /auth/forgot-password` — rate-limited 3/min, always returns HTTP 200 (no user enumeration); generates 32-byte token, stores SHA-256 hash, emails reset link with 1-hour TTL
- `POST /auth/reset-password` — validates hashed token, enforces expiry, sets new password, clears token fields, revokes all sessions
- `POST /admin/tenants/{tenant_id}/reset-password` — admin-only; audited under `auth.admin_password_reset_requested`

**Dashboard pages:**
- `/forgot-password` — email submission form
- `/reset-password?token=...` — new-password form
- Admin panel: "Reset Password" button per tenant

### 7. Field-Level Encryption for Tenant Config
**API commit:** [`2a4d41db`](https://github.com/ivandioneo/autoflow-api/commit/2a4d41db25ce7f1c66d437cd55a2232f810d8a62)  
**Dashboard fix:** [`4d608cef`](https://github.com/ivandioneo/autoflow-dashboard/commit/4d608cef5867ea50f4f343aaaf7ee618a2eb3b12)

- Fernet encryption applied to all string config values on create and update
- Decryption applied on list, get, and engine lookup
- Update merges by decrypting existing values first, merging plaintext, then re-encrypting
- Existing plaintext rows remain readable via Fernet fallback until next save (graceful migration)

### 8. Resend-Verification Rate Limit (IP-based)
**API commit:** [`1107e2e3`](https://github.com/ivandioneo/autoflow-api/commit/1107e2e38b6d9492d7b51e9aacc3080c87b416ab)

- `POST /auth/resend-verification` rate-limited to **3 requests/minute per IP**

### 9. Developer Section & API Key in Settings
**Dashboard commit:** [`d87a2e78`](https://github.com/ivandioneo/autoflow-dashboard/commit/d87a2e782aab3c0c8abaaa4437bf28a58c4e9e52)

- Settings page: Developer section with masked API key, show/hide toggle, copy button
- API key is the tenant's API key from `/auth/me`

**Production verified.** ✅

### 10. Engine Pipeline End-to-End
**API commit:** [`f14c5eb4`](https://github.com/ivandioneo/autoflow-api/commit/f14c5eb4)

- Automation engine executes node pipeline on CT116
- `http_request:test-echo` template returns HTTP 200 OK
- Run logs persisted to DB and surfaced via `/logs/{automation_id}`

### 11. Unverified Login UX
**Dashboard commit:** [`55e512c0`](https://github.com/ivandioneo/autoflow-dashboard/commit/55e512c0b0ed1a96617b09ea13e0078ff0cb2568)

- 403 on login surfaces the API `detail` message (e.g. "Email not verified")
- Resend verification button visible and functional on the unverified-login screen

**Production re-verified 2026-08-16 17:16 +04.** ✅

### 12. Booking Pages, Services & Leads
**API + Dashboard:** Multiple commits

- Public booking form at `/b/{slug}` — renders service info, accepts lead submissions
- On submit: business notification email + customer confirmation email sent via Resend
- Booking management UI in dashboard: view leads, manage services and booking pages
- Email fix deployed

**Production verified 2026-08-16 18:36 +04:**
- Public form at `/b/ccflow` submitted → "Request received!" ✅
- Customer confirmation email sent to `ivandioneo2000@gmail.com` ✅

### 13. Cloudflare Pages Security Headers
**Dashboard commit:** [`7315d472`](https://github.com/ivandioneo/autoflow-dashboard/commit/7315d472)

- `_headers` file: HSTS, strict CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

### 14. Run History UI (`/logs`)
**Dashboard:** Multiple commits

- `/logs` page: paginated, filterable run history table
- Columns: Timestamp, Template, Status (Success/Error badges)
- Row expand/collapse for full JSON output (including error details)
- Skeleton loader for initial load
- Status and per-page count filters

**Production verified 2026-08-16 18:36 +04:**
- Table loads with real data ✅
- Success and Error status badges render correctly ✅
- Row expand shows full JSON result ✅
- `← Automations` nav button functional ✅

### 15. HTTP Request Node Dashboard UI (`/integrations/http`)
**Dashboard:** [`HttpRequest.jsx`](https://github.com/ivandioneo/autoflow-dashboard/blob/main/src/pages/HttpRequest.jsx) · [`HttpRequest.css`](https://github.com/ivandioneo/autoflow-dashboard/blob/main/src/pages/HttpRequest.css)

- Route `/integrations/http` protected and registered in `App.jsx`
- "HTTP Request" nav button in dashboard header (`Templates.jsx`)
- Method selector (GET / POST / PUT / PATCH / DELETE)
- Destination URL field
- Dynamic header rows (add / remove key-value pairs)
- Body template textarea with `{{placeholder}}` interpolation hint
- Enable / Disable toggle persisted on save
- Save: creates or updates config via `api.createConfig` / `api.updateConfig`
- Config reloads on hard refresh (persists URL, method, headers, body, enabled state)
- Inline test panel: fires live engine trigger with `X-API-Key` auth, displays HTTP status code and response body

**Full production smoke test — 2026-08-16 22:21 +04:** ✅

| Check | Result |
|-------|--------|
| Login → lands on `/` | ✅ |
| Hard refresh → session restores | ✅ |
| LocalStorage — zero auth tokens | ✅ |
| `autoflow_refresh` cookie — HttpOnly, Secure, SameSite=Strict | ✅ |
| Automation cards render | ✅ |
| Header nav: Run History · Booking · HTTP Request · Settings · Sign out | ✅ |
| Admin button — admin tenant only | ✅ |
| `/integrations/http` loads correctly | ✅ |
| Save config → "Saved ✓" feedback | ✅ |
| Hard refresh → config persists | ✅ |
| Test panel: `POST https://httpbin.org/post` → HTTP 200 | ✅ |
| Enabled/Disabled toggle persists after save + hard refresh | ✅ |
| `/logs` loads, filters work, rows expand/collapse | ✅ |
| Skeleton loader visible on throttled connection | ✅ |
| `/booking` renders services and leads | ✅ |
| Public booking form (`/b/{slug}`) submits successfully | ✅ |
| Business notification email delivered | ✅ |
| Customer confirmation email delivered | ✅ |
| `/settings` — API key masked, show/copy functional | ✅ |
| Name update saves and reflects immediately | ✅ |
| Sign out → `/login`; hard refresh stays on `/login` | ✅ |
| `autoflow_refresh` cookie cleared on logout | ✅ |

### 16. Admin Audit Log UI — Security Events Tab
**Dashboard:** [`AdminOverview.jsx`](https://github.com/ivandioneo/autoflow-dashboard/blob/main/src/pages/AdminOverview.jsx)  
**API:** [`app/routers/admin.py`](https://github.com/ivandioneo/autoflow-api/blob/main/app/routers/admin.py) — `GET /admin/audit`

- Audit log is embedded as the **"Security events" tab** inside the `/admin` overview page
- All four admin data sources fetched in parallel on load: `stats`, `tenants`, `activity`, `audit`
- Each audit event renders: action label, details (key: value pairs), IP address, relative timestamp
- Failed/error events shown with red dot; successful events with green dot
- Tab toggle between "Automation runs" and "Security events" with no additional navigation
- `api.getAdminAudit()` in `api.js` calls `GET /admin/audit` with session auth

**Code audit (2026-08-16):** Fully implemented across API and dashboard — no separate page needed. ✅

### 17. Per-Email 24h Resend-Verification Cooldown
**API PR #19 → [`3acec82e`](https://github.com/ivandioneo/autoflow-api/commit/3acec82e9982c6e8cea2d88da1da6c0de7e80cda)**

- `verification_resent_at` column added to `tenants` table (nullable `TIMESTAMPTZ`)
- `POST /auth/resend-verification` now enforces a **24-hour per-email cooldown** in addition to the existing 3/min IP rate limit
- First resend stamps `verification_resent_at = now()`; subsequent resends within 24h return HTTP **429** with a human-readable countdown: _"Verification email already sent. You can request another in Xh Ym."_
- Already-verified accounts return HTTP 200 immediately — no cooldown applies
- `alembic==1.13.3` added to `requirements.txt` (was missing; future migrations now work via `docker compose exec autoflow-api alembic upgrade head`)
- Column applied to production DB via direct SQLAlchemy migration on 2026-08-16

**Production verified 2026-08-16 22:56 +04:**
- Second resend attempt → dashboard shows "Verification email already sent. You can request another in 23h 59m." ✅

---

## Pending Verification

None. All shipped features are production-verified. ✅

---

## Current Production HEAD

| Repo | Branch | HEAD Commit |
|------|--------|-------------|
| `autoflow-api` | `main` | [`3acec82e`](https://github.com/ivandioneo/autoflow-api/commit/3acec82e9982c6e8cea2d88da1da6c0de7e80cda) — feat: per-email 24h resend-verification cooldown + add alembic to requirements |
| `autoflow-dashboard` | `main` | `77d73dbc` — docs: PROJECT_STATUS.md full smoke test results |

---

## Backlog

| Priority | Item | Notes |
|----------|------|-------|
| 🔴 High | **Playwright E2E test suite** | Cover: login, hard refresh/session restore, logout, email verification flow, password reset, run history filters, HTTP Request config + test panel, booking public form submission |
| 🟡 Medium | **Multi-node automation builder** | Visual pipeline editor — chain HTTP Request, delay, condition, and notify nodes |
| 🟢 Low | **Multi-tenant plan enforcement** | Usage limits per plan tier (e.g. max automations, max runs/month) |
