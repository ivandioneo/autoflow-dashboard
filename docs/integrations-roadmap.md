# AutoFlow — Integrations Roadmap

**Date:** 2026-08-16
**Status:** Brainstorm / Pre-planning
**Scope:** Tenant-facing automation integrations built on `BaseExecutor`

---

## 1. Architecture Primer

Every integration is an **executor** in `app/engine/` on the API.
All executors share the same contract from `app/engine/base.py`:

```python
async def execute(self, config: dict, payload: dict) -> ExecutionResult
```

- `config` — the tenant’s saved, decrypted config for that template (credentials, targets, options)
- `payload` — live data injected at trigger time (form submission, webhook body, etc.)
- `ExecutionResult` — `{ success, data, error }`

The engine’s `registry.py` maps slug prefixes to executors.  
Adding a new integration = one new `*_executor.py` file + one registry entry + one dashboard config page.

Credentials (API keys, OAuth tokens, service account JSON) are **stored encrypted** in
`TenantConfig.config` and never returned to the frontend in plaintext.

---

## 2. Existing Integrations

| Slug prefix | Executor | Status |
|------------|---------|--------|
| `http_request:*` | `HttpRequestExecutor` | ✅ API complete, dashboard UI in progress |

---

## 3. Proposed Integrations (Priority Order)

Only integrations that are genuinely essential to tenants are included.
Each is scoped to the minimum viable action set.

---

### 3.1 Google Sheets — `google_sheets:*`

**Why essential:** Most small-business tenants use Google Sheets as a lightweight
database / CRM. Appending a row on a form submission or booking is the #1 requested
automation pattern.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `google_sheets:append_row` | Appends a new row to a named sheet |
| `google_sheets:update_row` | Updates a specific row by a key column match |
| `google_sheets:find_row` | Returns the first row matching a key/value |

**Config fields (stored per tenant, encrypted):**

| Field | Notes |
|-------|-------|
| `spreadsheet_id` | From the Google Sheets URL |
| `sheet_name` | Tab name (e.g. `Sheet1`) |
| `service_account_json` | Full service account JSON — **stored encrypted, never exposed to frontend** |
| `column_map` | Maps payload keys to column headers (JSON object) |

**API implementation notes:**
- Use `google-auth` + `gspread` (or raw Google Sheets API v4 via httpx)
- Service account must have Editor access to the target spreadsheet
- `column_map` drives `{{key}}` → column substitution at execute time

**Dashboard UI:**
- Config form with spreadsheet ID, sheet name, column mapper, service account upload
- Test panel: supply a sample payload, preview the row that would be appended

---

### 3.2 Email (via Resend) — `email:*`

**Why essential:** Booking confirmations, lead follow-ups, and notifications are
already using Resend internally. Tenants need a configurable email action they
can wire to any trigger.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `email:send` | Sends a templated email to one recipient |
| `email:notify_owner` | Sends a notification to the tenant’s own address |

**Config fields:**

| Field | Notes |
|-------|-------|
| `to` | Recipient — can use `{{payload_key}}` |
| `subject` | Subject line with `{{key}}` interpolation |
| `body_html` | HTML body with `{{key}}` interpolation |
| `reply_to` | Optional reply-to address |

**API implementation notes:**
- Reuse the existing Resend client already in the codebase
- Tenant-level `from` address = tenant’s verified Resend sender (or platform default)
- No new credentials needed if tenant uses platform Resend key

**Dashboard UI:**
- Rich text / HTML editor for `body_html`
- Live `{{key}}` preview with sample payload
- Send test email button

---

### 3.3 Webhook (Outbound) — `webhook:*`

**Why essential:** Lets tenants push data to any third-party system
(Zapier, Make, n8n, custom endpoint) without needing the full HTTP Request
configuration complexity. Opinionated defaults (POST, JSON, HMAC signature).

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `webhook:send` | POST a JSON payload to a URL, with optional HMAC-SHA256 signature header |

**Config fields:**

| Field | Notes |
|-------|-------|
| `url` | Target webhook URL |
| `secret` | Optional HMAC secret — adds `X-AutoFlow-Signature` header |
| `include_fields` | Allowlist of payload fields to forward (empty = all) |

**API implementation notes:**
- Thin wrapper over `HttpRequestExecutor` with opinionated defaults
- HMAC: `HMAC-SHA256(secret, json_body)` — header: `X-AutoFlow-Signature: sha256=<hex>`
- Retry: one retry on 5xx after 2 s

**Dashboard UI:**
- Simple form: URL + secret + field filter
- Test panel with live signature preview

---

### 3.4 Notion — `notion:*`

**Why essential:** Notion is widely used by small teams as a lightweight project
tracker / CRM. Creating a page on form submission is a natural fit.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `notion:create_page` | Creates a new page in a database |
| `notion:update_page` | Updates a page property by a filter match |

**Config fields:**

| Field | Notes |
|-------|-------|
| `integration_token` | Notion Internal Integration secret — stored encrypted |
| `database_id` | Target Notion database ID |
| `property_map` | Maps payload keys to Notion property names |

**API implementation notes:**
- Use Notion API v1 via httpx (no heavy SDK needed)
- Property type coercion: string → title/rich_text, ISO date → date, number → number

---

### 3.5 Airtable — `airtable:*`

**Why essential:** Airtable is a common no-code database used by SMBs.
Same use case as Google Sheets but for Airtable-native teams.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `airtable:create_record` | Creates a new record in a table |
| `airtable:update_record` | Updates a record matched by a field value |

**Config fields:**

| Field | Notes |
|-------|-------|
| `api_key` | Airtable Personal Access Token — stored encrypted |
| `base_id` | Airtable Base ID |
| `table_name` | Table name or ID |
| `field_map` | Maps payload keys to Airtable field names |

---

### 3.6 WhatsApp (via WhatsApp Business API / Meta) — `whatsapp:*`

**Why essential:** In many markets (MENA, LatAm, SEA) WhatsApp is the primary
business communication channel. Sending a booking confirmation or lead notification
via WhatsApp is more effective than email.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `whatsapp:send_template` | Sends an approved WhatsApp message template |

**Config fields:**

| Field | Notes |
|-------|-------|
| `phone_number_id` | Meta WhatsApp Business phone number ID |
| `access_token` | Meta system user token — stored encrypted |
| `template_name` | Approved template name |
| `template_language` | e.g. `en_US` |
| `param_map` | Maps payload keys to template `{{1}}`, `{{2}}` params |

**API implementation notes:**
- Use Meta Cloud API (`graph.facebook.com/v19.0/{phone_number_id}/messages`)
- Template must be pre-approved in Meta Business Manager
- Recipient phone number comes from payload (`{{phone}}` or similar)

---

### 3.7 Slack — `slack:*`

**Why essential:** Internal team notifications — new lead, new booking, payment received.
Simple and high-value for any team using Slack.

**Actions (MVP):**

| Action slug | What it does |
|------------|-------------|
| `slack:send_message` | Posts a message to a channel or DM |

**Config fields:**

| Field | Notes |
|-------|-------|
| `bot_token` | Slack Bot OAuth token — stored encrypted |
| `channel` | Channel ID or `#name` |
| `message_template` | Message text with `{{key}}` interpolation |

---

## 4. Integrations Not In Scope (for now)

| Integration | Reason deferred |
|------------|----------------|
| Google Calendar | OAuth2 PKCE flow adds complexity; bookings are handled natively |
| Stripe | Payment capture is a separate feature, not a trigger-action |
| Twilio SMS | WhatsApp covers the high-priority SMS markets; Twilio adds cost complexity |
| HubSpot CRM | High setup friction; Airtable/Notion cover the SMB CRM use case |
| Salesforce | Enterprise-only; out of current tenant scope |

---

## 5. Implementation Order (Recommended)

```
Phase 1 (current):
  HTTP Request node  — dashboard UI

Phase 2:
  Email (send)       — reuses existing Resend setup, lowest effort
  Webhook (outbound) — thin wrapper over HTTP Request, lowest risk

Phase 3:
  Google Sheets      — highest tenant demand
  Notion             — common among target tenants

Phase 4:
  Airtable           — same pattern as Google Sheets
  WhatsApp           — high value in target markets
  Slack              — internal notification layer
```

---

## 6. Shared Design Decisions

- All credentials stored **encrypted at rest** in `TenantConfig.config`. Never returned to frontend.
- All executors support `{{key}}` interpolation from `payload` in any string field.
- Every integration gets: an API executor, a dashboard config page, a test panel.
- Dashboard config pages live under `/integrations/<name>` routes.
- All integration routes added to a new **Integrations** section in the sidebar nav.
- Template slugs follow `<integration>:<action>` convention (e.g. `google_sheets:append_row`).

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-08-16 | Initial integrations roadmap created |
