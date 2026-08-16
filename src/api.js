const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.autoflow.ivanit.work/api/v1";

// Public booking routes live at the root, not under /api/v1
const API_ROOT = API_BASE.replace(/\/api\/v1$/, "");

let accessToken = null;
let refreshInFlight = null;

function getToken() {
  return accessToken;
}

function clearSession() {
  accessToken = null;
}

function saveAccessToken(data) {
  if (!data) return data;
  const access = data.access_token || data.token;
  if (access) accessToken = access;
  return data;
}

function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch(API_BASE + "/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (!data) return null;
      saveAccessToken(data);
      return data.access_token || data.token || null;
    })
    .catch(function () {
      return null;
    })
    .finally(function () {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function buildHeaders(options) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...options.headers,
  };
}

async function request(path, options = {}, isRetry = false) {
  const { skipAuth = false, ...fetchOptions } = options;
  const res = await fetch(API_BASE + path, {
    ...fetchOptions,
    credentials: "include",
    headers: buildHeaders(fetchOptions),
  });
  if (res.status === 401 && !skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request(path, options, true);
    clearSession();
    window.location.href = "/login";
    return;
  }
  if (res.status === 401) {
    if (!skipAuth) {
      clearSession();
      window.location.href = "/login";
      return;
    }
    const err = await res.json().catch(function () { return { detail: "Request failed" }; });
    throw new Error(typeof err.detail === "string" ? err.detail : "Request failed");
  }
  if (res.status === 403) {
    const err = await res.json().catch(function () { return { detail: "You don't have access to this." }; });
    const msg = typeof err.detail === "string" ? err.detail : "You don't have access to this.";
    const error = new Error(msg);
    error.status = 403;
    throw error;
  }
  if (!res.ok) {
    const err = await res.json().catch(function () { return { detail: "Request failed" }; });
    const detail = err.detail;
    const message = Array.isArray(detail)
      ? detail.map(function (item) {
          return item.msg || JSON.stringify(item);
        }).join("; ")
      : typeof detail === "string"
        ? detail
        : "Request failed";
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Registration returns HTTP 202 {message} — no access token.
  // Do NOT call saveAccessToken here.
  register: function (name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email, password: password }),
      skipAuth: true,
    });
  },
  login: function (email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
      skipAuth: true,
    }).then(saveAccessToken);
  },
  restoreSession: function () {
    return refreshAccessToken().then(function (token) {
      if (!token) clearSession();
      return token;
    });
  },
  logout: function () {
    return request("/auth/logout", { method: "POST" }).catch(function () { return null; }).finally(clearSession);
  },
  getMe: function () { return request("/auth/me"); },
  resendVerification: function (email, password) {
    return request("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
      skipAuth: true,
    });
  },
  forgotPassword: function (email) {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email }),
      skipAuth: true,
    });
  },
  resetPassword: function (token, new_password) {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: token, new_password: new_password }),
      skipAuth: true,
    });
  },
  getTemplates: function () { return request("/templates/"); },
  getConfigs: function (tenantId) { return request("/tenants/" + tenantId + "/configs"); },
  createConfig: function (tenantId, data) { return request("/tenants/" + tenantId + "/configs", { method: "POST", body: JSON.stringify(data) }); },
  updateConfig: function (tenantId, configId, data) { return request("/tenants/" + tenantId + "/configs/" + configId, { method: "PATCH", body: JSON.stringify(data) }); },
  updateTenant: function (tenantId, data) { return request("/tenants/" + tenantId, { method: "PATCH", body: JSON.stringify(data) }); },
  getLogs: function (tenantId, params) {
    const qs = new URLSearchParams(params || {}).toString();
    return request("/tenants/" + tenantId + "/logs" + (qs ? "?" + qs : ""));
  },
  triggerAutomation: function (templateSlug, payload) {
    return request("/engine/trigger/" + encodeURIComponent(templateSlug), {
      method: "POST",
      body: JSON.stringify({ payload: payload }),
    });
  },
  // Booking — public (no auth) — use API_ROOT, not API_BASE
  getBookingPage: function (slug) {
    return fetch(API_ROOT + "/b/" + slug)
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Booking page not found");
          return data;
        });
      });
  },
  submitBooking: function (slug, data) {
    return fetch(API_ROOT + "/b/" + slug + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Submission failed");
        return body;
      });
    });
  },
  // Booking — tenant-auth
  // POST to create; if 409 (already exists) fall back to PATCH to update.
  createOrUpdateBookingPage: function (data) {
    return request("/booking/page", { method: "POST", body: JSON.stringify(data) })
      .catch(function (err) {
        if (err.message && err.message.toLowerCase().includes("already exists")) {
          return request("/booking/page", { method: "PATCH", body: JSON.stringify(data) });
        }
        throw err;
      });
  },
  getBookingPageConfig: function () {
    return request("/booking/page");
  },
  getLeads: function (status) {
    const qs = status ? "?status=" + encodeURIComponent(status) : "";
    return request("/booking/leads" + qs);
  },
  updateLeadStatus: function (leadId, status) {
    return request("/booking/leads/" + leadId, { method: "PATCH", body: JSON.stringify({ status: status }) });
  },
  getAdminStats: function () { return request("/admin/stats"); },
  getAdminTenants: function () { return request("/admin/tenants"); },
  getAdminTenant: function (tenantId) { return request("/admin/tenants/" + tenantId); },
  getAdminActivity: function () { return request("/admin/activity"); },
  getAdminAudit: function () { return request("/admin/audit"); },
  updateTenantPlan: function (tenantId, plan) { return request("/admin/tenants/" + tenantId + "/plan?plan=" + encodeURIComponent(plan), { method: "PATCH" }); },
  adminResetTenantPassword: function (tenantId) { return request("/admin/tenants/" + tenantId + "/reset-password", { method: "POST" }); },
};
