# AutoFlow Project Status

**Last updated:** 2026-08-16 18:22 +04  
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

### 8. Resend-Verification Rate Limit
**API commit:** [`1107e2e3`](https://github.com/ivandioneo/autoflow-api/commit/1107e2e38b6d9492d7b51e9aacc3080c87b416ab)

- `POST /auth/resend-verification` rate-limited to **3 requests/minute**

### 9. Developer Section — API Key in Settings
**Dashboard commit:** [`135eccbc`](https://github.com/ivandioneo/autoflow-dashboard/commit/135eccbcce25577643f4a4bab7847e77acd2cc60)  
**Date:** 2026-08-09

- Settings page (`/settings`) includes a **Developer** section with masked API key, Show/Hide toggle and Copy button
- `tenant.api_key` surfaced via `TenantResponse` — no dedicated `/auth/api-key` endpoint needed
- **Production verified:** Developer card visible at `dashboard.autoflow.ivanit.work/settings` ✅

### 10. Engine Pipeline — End-to-End Production Validation
**Date:** 2026-08-09

Full production smoke test on CT116:

- Trigger route resolves `http_request:test-echo` slug → `HttpRequestExecutor` via prefix registry ✅
- API key auth (`X-API-Key` UUID header) validated against DB ✅
- Outbound HTTP POST with payload interpolation (`{{event}}` → `test_run`) → httpbin.org/post → 200 OK ✅

### 11. Unverified Login UX — Resend Screen on 403
**Dashboard PR #9 → [`98091fc7`](https://github.com/ivandioneo/autoflow-dashboard/commit/98091fc7d3c48e99c8738c86d518c436620e6b03)**  
**Date:** 2026-08-09

- `isUnverifiedError()` helper in `Login.jsx` detects `err.status === 403` or verification keywords
- Logging in with an unverified account shows the "Check your inbox" screen with a Resend button
- Removed 3 dead `localStorage.removeItem` calls from `clearSession()` in `api.js`

**Production tested:** 2026-08-09 22:04 +04 — all checks passed ✅  
**Resend button production verified:** 2026-08-16 17:16 +04 ✅

### 12. Booking Pages, Services & Leads API
**API PR #14 → [`512e4e87`](https://github.com/ivandioneo/autoflow-api/commit/512e4e87439dc1e1e143b5ca5b0d4efd69e26941)**  
**API fix → [`c6ec171a`](https://github.com/ivandioneo/autoflow-api/commit/c6ec171a1c61ea9e0ed2c07aa937f8fd8eca7655)**  
**Dashboard → [`a425538c`](https://github.com/ivandioneo/autoflow-dashboard/commit/a425538c52bc5d101141b08fb6422de1fb16ebda) · [`99c944ff`](https://github.com/ivandioneo/autoflow-dashboard/commit/99c944ff3c84f3b1ee366d4d2c0f806bd61f76f4) · [`ebc8be05`](https://github.com/ivandioneo/autoflow-dashboard/commit/ebc8be0597f43d8106f91d527f97747d65d5e97c) · [`ad6831ae`](https://github.com/ivandioneo/autoflow-dashboard/commit/ad6831ae2ebbd096d3fa6f2bba672434d17d7e43)**  
**Date:** 2026-08-11

Each tenant can create a hosted public booking/quote page at `/b/{slug}` with its own service catalogue and lead inbox.

**New models (`app/models.py`):**

| Model | Table | Purpose |
|-------|-------|---------| 
| `BookingPage` | `booking_pages` | One per tenant; slug globally unique; stores business name, description, enabled flag, notify email |
| `BookingService` | `booking_services` | Services on the page; name, duration, price hint, active flag, sort order |
| `BookingLead` | `booking_leads` | Submitted leads; type (booking/quote), service, preferred datetime, name, phone, optional email and notes, status |

**New routers:**

- `app/routers/booking_public.py` — unauthenticated, tags `booking-public`:
  - `GET /b/{slug}` — returns public page with active services list
  - `POST /b/{slug}/submit` — accepts lead (booking or quote), rate-limited 10/min; fires two fire-and-forget Resend emails:
    - **Business notification** to `page.notify_email` (falls back to tenant email)
    - **Customer confirmation** to submitted email (skipped if no email provided)

- `app/routers/booking_mgmt.py` — authenticated, prefix `/booking`, tags `booking-mgmt`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/booking/page` | GET | Fetch tenant's booking page |
| `/booking/page` | POST | Create booking page (one per tenant, slug unique) |
| `/booking/page` | PATCH | Update page fields |
| `/booking/services` | GET | List services ordered by sort_order |
| `/booking/services` | POST | Add a service |
| `/booking/services/{id}` | PATCH | Update service fields |
| `/booking/services/{id}` | DELETE | Remove a service |
| `/booking/leads` | GET | List leads, filterable by status |
| `/booking/leads/{id}` | PATCH | Update lead status (new / seen / done / dismissed) |

**Lead status lifecycle:** `new` → `seen` → `done` / `dismissed`

**Dashboard changes:**
- Booking page setup UI (slug, business name, description, enable toggle) at `/booking`
- Services management panel
- Leads management panel
- `BookingPage` form fields aligned with `LeadSubmit` schema
- API routing fixed — public booking routes use `API_ROOT` (no `/api/v1` prefix)
- Confirmation email hint shown on the public booking form

**Fix:** Pre-build optional HTML email rows to avoid nested f-string blank body bug (`c6ec171a`)

### 13. Cloudflare Pages Security Headers
**Dashboard commit:** [`7315d472`](https://github.com/ivandioneo/autoflow-dashboard/commit/7315d47265f11731e8d722bfadfde481bda813ee)  
**Date:** 2026-08-14

- `public/_headers` file added to the dashboard repo
- Sets HSTS (`max-age=31536000; includeSubDomains; preload`), strict CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`
- Deployed automatically by Cloudflare Pages on next `main` push

### 14. Engine Pipeline UI — Run History
**API commit:** already merged in `app/routers/tenants.py` on `main`  
**Dashboard files:** `src/pages/RunHistory.jsx` · `src/pages/RunHistory.css` · `src/App.jsx`  
**Date:** merged before 2026-08-16

Full run history UI is live at `/logs` (protected route).

**API (`app/routers/tenants.py`):**
- `GET /tenants/{tenant_id}/logs` — returns paginated `ActivityLog` rows
- Query params: `status` (success / error), `limit` (1–200, default 50), `offset`
- Reuses `_authorize()` ownership check (tenant can only see own logs; admin sees all)
- `ActivityLogResponse` schema: id, template_slug, status, details (JSONB), created_at

**Dashboard (`src/pages/RunHistory.jsx`):**
- Status badge component with green (`success`) and red (`error`) pill variants
- `LogRow` — click to expand/collapse collapsible JSON details panel
- `SkeletonRows` — 6-row shimmer loader during fetch
- Filter bar: status (`All / Success / Error`) and limit selector (`25 / 50 / 100 / 200`)
- Empty state with icon and hint copy
- Refetches automatically on filter or limit change

**`src/api.js`:** `getLogs(tenantId, params)` builds query string and calls the logs endpoint.

### 15. HTTP Request Node — Dashboard UI
**Dashboard files:** `src/pages/HttpRequest.jsx` · `src/pages/HttpRequest.css` · `src/App.jsx` (route) · Sidebar (nav link)  
**Date:** 2026-08-16

Full HTTP Request integration UI live at `/integrations/http`.

**Features:**
- Create and edit `http_request:*` tenant configs
- Form fields: template name/slug, destination URL, HTTP method (GET/POST/PUT/PATCH/DELETE), custom headers (key-value editor), body template (textarea with `{{key}}` placeholder support), enabled toggle
- **Inline test panel:** sample JSON payload → `POST /engine/trigger/{slug}` → response status + body displayed inline
- New **Integrations** section in the sidebar nav

**Production verified (2026-08-16 18:22 +04):**
- Dashboard UI loads at `/integrations/http` ✅
- Custom headers sent correctly — `"Here": "Test"` confirmed in httpbin response ✅
- Outbound HTTPS from CT116 container confirmed — origin IP `94.206.108.61` ✅
- `{{key}}` body interpolation works end-to-end ✅
- Test panel returns HTTP 200 with full JSON response inline ✅

---

## Current Production State

| Component | HEAD commit | Deployed |
|-----------|------------|---------|
| API (`main`) | [`c6ec171a`](https://github.com/ivandioneo/autoflow-api/commit/c6ec171a1c61ea9e0ed2c07aa937f8fd8eca7655) — fix: pre-build optional email rows | ✅ CT116 Docker Compose |
| Dashboard (`main`) | [`7315d472`](https://github.com/ivandioneo/autoflow-dashboard/commit/7315d47265f11731e8d722bfadfde481bda813ee) — security: add Cloudflare Pages _headers | ✅ Cloudflare Pages |

### Standard Release Checks (Last Verified)

- [x] API health endpoint responds
- [x] Cloudflare Pages deployed intended `main` commit
- [x] Verified-account login succeeds
- [x] Dashboard localStorage has no authentication tokens
- [x] `autoflow_refresh` cookie: HttpOnly, Secure, SameSite=Strict
- [x] Hard refresh restores session
- [x] Logout clears session; subsequent refresh stays on `/login`
- [x] Engine trigger pipeline: `http_request:test-echo` → 200 OK end-to-end ✅
- [x] Settings Developer section: API key masked, Show/Copy functional ✅
- [x] Unverified login → Resend button functional and sends email ✅ *(verified 2026-08-16)*
- [x] Email verification enforcement: all layers audited complete in production code ✅ *(verified 2026-08-16)*
- [x] HTTP Request node dashboard UI: create/edit/test panel → HTTP 200 end-to-end ✅ *(verified 2026-08-16)*
- [ ] Run History `/logs` page: loads, filters, and expands log rows *(pending browser verification)*
- [ ] Booking page public form: lead submission → business notification email *(pending re-verify post-fix)*
- [ ] Booking page public form: customer confirmation email *(pending re-verify post-fix)*

---

## Next Priorities

| Priority | Feature | Notes |
|----------|---------|-------|
| 🔴 High | **Run History `/logs` browser verification** | Load page, filter by status, expand a log row |
| 🔴 High | **Booking page smoke test** | Verify lead submission + business/customer emails post-fix |
| 🟡 Medium | Audit log UI (admin panel) | Surface `auth.*` audit events in the admin dashboard |
| 🟡 Medium | E2E test suite (Playwright) | Cover login, hard refresh, logout, email verification, password reset, run history, HTTP Request node |
| 🟢 Low | Resend-verification further hardening | Consider per-email daily cap in addition to per-minute rate limit |

---

## Authentication Rules (Permanent)

- Access tokens: in-memory only — never localStorage, sessionStorage, URLs, logs, or screenshots
- Refresh sessions: `autoflow_refresh` HttpOnly, Secure, SameSite=Strict cookie scoped to API
- No fallback JWT secret — API must fail at startup if `JWT_SECRET` is missing
- Never request, expose, commit, log, or paste `.env` content, JWT secrets, API keys, passwords, bearer tokens, refresh-cookie values, database URLs, or email credentials
- Screenshots containing tokens or cookies: advise logout/revocation, do not repeat the value

---

## Key File Map

### API (`ivandioneo/autoflow-api`)

| File | Purpose |
|------|---------|
| `app/routers/auth.py` | `/register`, `/login`, `/refresh`, `/logout`, `/verify`, `/resend-verification`, `/forgot-password`, `/reset-password` |
| `app/routers/admin.py` | Admin tenant management, admin password reset |
| `app/routers/booking_public.py` | Public booking page (`GET /b/{slug}`, `POST /b/{slug}/submit`) — no auth |
| `app/routers/booking_mgmt.py` | Authenticated booking page, services, and leads management (`/booking/*`) |
| `app/routers/tenants.py` | Tenant CRUD, config management, `GET /tenants/{id}/logs` run history |
| `app/routers/engine.py` | Automation trigger endpoint |
| `app/engine/http_request.py` | `HttpRequestExecutor` — URL, method, headers, body_template interpolation, httpx async |
| `app/engine/registry.py` | Executor prefix registry (`http_request:` → `HttpRequestExecutor`) |
| `app/auth.py` | JWT creation/validation, `get_current_tenant`, cookie helpers |
| `app/models.py` | `Tenant`, `RefreshToken`, `AuditLog`, `ActivityLog`, `Template`, `TenantConfig`, `BookingPage`, `BookingService`, `BookingLead` |
| `app/schemas.py` | Pydantic request/response schemas incl. `ActivityLogResponse`, all booking schemas |
| `app/encryption.py` | Fernet field-level encryption helpers |
| `app/main.py` | FastAPI app entry, startup JWT_SECRET guard, router registration |
| `tests/test_email_verification.py` | 8 automated tests for email verification enforcement |

### Dashboard (`ivandioneo/autoflow-dashboard`)

| File | Purpose |
|------|---------|
| `src/api.js` | Fetch wrapper, token management, all API helpers incl. `getLogs()` |
| `src/App.jsx` | App shell, session restore on load, routing (incl. `/logs` → `RunHistory`, `/integrations/http` → `HttpRequest`) |
| `src/pages/Login.jsx` | Login form, registration form, verify-pending state, resend flow |
| `src/pages/ForgotPassword.jsx` | Self-service forgot-password form |
| `src/pages/ResetPassword.jsx` | Token-based password reset form |
| `src/pages/RunHistory.jsx` | Run history table, status badges, collapsible JSON, skeleton loader, filters |
| `src/pages/RunHistory.css` | Styles for run history table, badges, skeleton shimmer, empty state |
| `src/pages/BookingSetup.jsx` | Booking page/services/leads management UI at `/booking` |
| `src/pages/BookingPage.jsx` | Public-facing booking/quote form at `/b/:slug` |
| `src/pages/Settings.jsx` | Account settings + Developer API key section |
| `src/pages/HttpRequest.jsx` | HTTP Request node config create/edit + inline test panel at `/integrations/http` |
| `src/pages/HttpRequest.css` | Styles for HTTP Request page |
| `public/_headers` | Cloudflare Pages security headers (HSTS, CSP, X-Frame-Options) |
