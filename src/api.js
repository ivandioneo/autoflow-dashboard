const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.autoflow.ivanit.work/api/v1";

let accessToken = null;
let refreshInFlight = null;

function getToken() {
  return accessToken;
}

function clearSession() {
  accessToken = null;
  localStorage.removeItem("autoflow_token");
  localStorage.removeItem("autoflow_refresh");
  localStorage.removeItem("autoflow_tenant");
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
  if (res.status === 403) throw new Error("You don't have access to this.");
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
  register: function (name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email, password: password }),
      skipAuth: true,
    }).then(saveAccessToken);
  },
  login: function (email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
      skipAuth: true,
    }).then(saveAccessToken);
  },
  restoreSession: function () {
    return refreshAccessToken();
  },
  logout: function () {
    return request("/auth/logout", { method: "POST" }).catch(function () { return null; }).finally(clearSession);
  },
  getMe: function () { return request("/auth/me"); },
  getTemplates: function () { return request("/templates/"); },
  getConfigs: function (tenantId) { return request("/tenants/" + tenantId + "/configs"); },
  createConfig: function (tenantId, data) { return request("/tenants/" + tenantId + "/configs", { method: "POST", body: JSON.stringify(data) }); },
  updateConfig: function (tenantId, configId, data) { return request("/tenants/" + tenantId + "/configs/" + configId, { method: "PATCH", body: JSON.stringify(data) }); },
  updateTenant: function (tenantId, data) { return request("/tenants/" + tenantId, { method: "PATCH", body: JSON.stringify(data) }); },
  getAdminStats: function () { return request("/admin/stats"); },
  getAdminTenants: function () { return request("/admin/tenants"); },
  getAdminTenant: function (tenantId) { return request("/admin/tenants/" + tenantId); },
  getAdminActivity: function () { return request("/admin/activity"); },
  getAdminAudit: function () { return request("/admin/audit"); },
  updateTenantPlan: function (tenantId, plan) { return request("/admin/tenants/" + tenantId + "/plan?plan=" + encodeURIComponent(plan), { method: "PATCH" }); },
};
