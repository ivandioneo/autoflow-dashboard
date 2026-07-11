const API_BASE = "https://api.autoflow.ivanit.work/api/v1";

const ACCESS_KEY = "autoflow_token";
const REFRESH_KEY = "autoflow_refresh";

function getToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("autoflow_tenant");
}

// Login/register responses carry both tokens. Store them here so callers
// (Login.jsx, App.jsx) don't have to know about refresh tokens at all.
function saveTokens(data) {
  if (!data) return data;
  const access = data.access_token || data.token;
  const refresh = data.refresh_token;
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  return data;
}

// Only one refresh may be in flight at a time. If three requests 401 at
// once, they all await the same promise instead of burning three refresh
// tokens and racing each other.
let refreshInFlight = null;

function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(null);

  refreshInFlight = fetch(API_BASE + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      if (!data) return null;
      saveTokens(data);
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
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: buildHeaders(options),
  });

  // Access tokens live 15 minutes. On the first 401, try to renew silently
  // and replay the request. Only bounce to /login if renewal fails.
  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request(path, options, true);
    }
    clearSession();
    window.location.href = "/login";
    return;
  }

  if (res.status === 401) {
    clearSession();
    window.location.href = "/login";
    return;
  }

  if (res.status === 403) {
    throw new Error("You don't have access to this.");
  }

  if (!res.ok) {
    const err = await res.json().catch(function () {
      return { detail: "Request failed" };
    });
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: function (name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email, password: password }),
    }).then(saveTokens);
  },

  login: function (email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    }).then(saveTokens);
  },

  logout: function () {
    // Revoke the refresh token server-side, then clear locally regardless.
    return request("/auth/logout", { method: "POST" })
      .catch(function () {
        return null;
      })
      .finally(clearSession);
  },

  getMe: function () {
    return request("/auth/me");
  },

  getTemplates: function () {
    return request("/templates/");
  },

  getConfigs: function (tenantId) {
    return request("/tenants/" + tenantId + "/configs");
  },

  createConfig: function (tenantId, data) {
    return request("/tenants/" + tenantId + "/configs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateConfig: function (tenantId, configId, data) {
    return request("/tenants/" + tenantId + "/configs/" + configId, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  updateTenant: function (tenantId, data) {
    return request("/tenants/" + tenantId, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // ---- Admin ----

  getAdminStats: function () {
    return request("/admin/stats");
  },

  getAdminTenants: function () {
    return request("/admin/tenants");
  },

  getAdminTenant: function (tenantId) {
    return request("/admin/tenants/" + tenantId);
  },

  getAdminActivity: function () {
    return request("/admin/activity");
  },

  getAdminAudit: function () {
    return request("/admin/audit");
  },

  updateTenantPlan: function (tenantId, plan) {
    return request("/admin/tenants/" + tenantId + "/plan", {
      method: "PATCH",
      body: JSON.stringify({ plan: plan }),
    });
  },
};
