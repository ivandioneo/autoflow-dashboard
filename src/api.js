const API_BASE = "https://api.autoflow.ivanit.work/api/v1";

function getToken() {
  return localStorage.getItem("autoflow_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...options.headers,
  };

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("autoflow_token");
    localStorage.removeItem("autoflow_tenant");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(function() { return { detail: "Request failed" }; });
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: function(name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email, password: password }),
    });
  },

  login: function(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    });
  },

  getMe: function() {
    return request("/auth/me");
  },

  getTemplates: function() {
    return request("/templates/");
  },

  getConfigs: function(tenantId) {
    return request("/tenants/" + tenantId + "/configs/");
  },

  createConfig: function(tenantId, data) {
    return request("/tenants/" + tenantId + "/configs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateConfig: function(tenantId, configId, data) {
    return request("/tenants/" + tenantId + "/configs/" + configId, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  updateTenant: function(tenantId, data) {
    return request("/tenants/" + tenantId, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
