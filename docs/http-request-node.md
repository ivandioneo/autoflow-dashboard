# AutoFlow — HTTP Request Node: Brainstorm & Design Doc

**Date:** 2026-08-16
**Status:** Planning / Pre-implementation
**Proposed branch:** `feature/http-request-node`

---

## 1. Context

AutoFlow is a multi-tenant business-automation dashboard and API.
Workflow nodes are template configs stored per tenant, and the engine routes
execution by slug prefix (e.g. `http_request:<name>`).

---

## 2. What Already Exists — API (No Changes Needed)

| File | What it does |
|------|-------------|
| `app/engine/http_request.py` | `HttpRequestExecutor` — async httpx, `{{key}}` body interpolation, JSON validation |
| `app/engine/registry.py` | Routes `http_request:*` slugs to `HttpRequestExecutor` |
| `GET /engine/config/{slug}` | Returns tenant config by API key |
| `POST /engine/trigger/{slug}` | Runs executor directly — already live |

The API is **complete**. All work is on the dashboard.

---

## 3. What Is Missing — Dashboard UI

`/integrations/http` route already exists in `App.jsx` and imports
`HttpRequest` from `src/pages/HttpRequest.jsx` — but the page file does not
exist yet. There is no UI to create, edit, or test an `http_request:*` config.

---

## 4. Proposed Page: `HttpRequest.jsx`

**Route:** `/integrations/http`
**Auth:** ProtectedRoute (tenant required)

### 4a. Config Form Fields

| Field | Input type | Config key | Notes |
|-------|-----------|-----------|-------|
| Template name (slug suffix) | text | builds `http_request:<name>` | slug-safe chars only |
| Destination URL | url | `url` | full URL with protocol |
| HTTP Method | select | `method` | GET / POST / PUT / PATCH / DELETE |
| Extra Headers | key-value pair editor | `headers` | e.g. `Authorization`, `Content-Type` |
| Body Template | textarea | `body_template` | supports `{{key}}` variable interpolation |
| Enabled | toggle | `enabled` | soft-disable without deleting |

### 4b. Test Panel

- Tenant supplies a sample JSON payload in a textarea
- Dashboard calls `POST /engine/trigger/{slug}` with that payload
- Response status code + body shown inline (no page navigation)
- Errors surfaced with a clear message — inline contextual feedback, not a toast

---

## 5. Open Questions (resolve before coding)

1. **Create + Edit, or Edit-only?**
   Recommendation: **both** — list existing `http_request:*` configs, allow
   editing each, and include a "New HTTP Request" button that creates a new one.

2. **Sidebar nav — new Integrations section or slot into existing?**
   `App.jsx` shows no existing Integrations group.
   Recommendation: add a new **Integrations** nav section with HTTP Request as
   the first item. Designed to grow (Webhook, Email, etc. later).

3. **`api.js` helpers**
   Need to confirm whether `createConfig` / `updateConfig` / `triggerAutomation`
   helpers already exist in `src/api.js` before writing the page.

---

## 6. Files To Create / Modify

| File | Action |
|------|--------|
| `src/pages/HttpRequest.jsx` | **Create** |
| `src/pages/HttpRequest.css` | **Create** |
| `src/api.js` | **Audit** — add missing config CRUD + trigger helpers if absent |
| `src/App.jsx` | Route already exists ✅ — no change needed |
| Sidebar component | **Modify** — add Integrations section + HTTP Request link |

---

## 7. Next Steps

1. Audit `src/api.js` for existing config CRUD and trigger helpers
2. Audit sidebar component for nav structure
3. Confirm answers to open questions (§5)
4. Write `HttpRequest.jsx` + `HttpRequest.css`
5. Update sidebar nav
6. Add any missing `api.js` helpers
7. `npm ci && npm run build` check
8. PR → main → Cloudflare Pages deploy
9. Standard release checks:
   - Login succeeds
   - Session restores on hard refresh
   - No auth tokens in localStorage
   - Refresh cookie has HttpOnly + Secure + SameSite=Strict
   - Logout clears session

---

## 8. Change Log

| Date | Change |
|------|--------|
| 2026-08-16 | Initial brainstorm doc created |
