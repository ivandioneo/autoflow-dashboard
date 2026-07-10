const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

function getToken() {
  return localStorage.getItem("autoflow_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("autoflow_token");
    localStorage.removeItem("autoflow_tenant");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register(name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  getMe() {
    return request("/auth/me");
  },

  getTemplates() {
    return request("/templates");
  },

  getConfigs(tenantId) {
    return request(`/tenants/${tenantId}/configs`);
  },

  createConfig(tenantId, data) {
    return request(`/tenants/${tenantId}/configs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateConfig(tenantId, configId, data) {
    return request(`/tenants/${tenantId}/configs/${configId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  updateTenant(tenantId, data) {
    return request(`/tenants/${tenantId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
