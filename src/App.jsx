import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "./api";
import Login from "./pages/Login";
import Templates from "./pages/Templates";
import Config from "./pages/Config";
import Settings from "./pages/Settings";
import AdminOverview from "./pages/AdminOverview";
import AdminTenantDetail from "./pages/AdminTenantDetail";
import AdminRoute from "./components/AdminRoute";

function ProtectedRoute({ tenant, children }) {
  if (!tenant) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [tenant, setTenant] = useState(null);
  // Until localStorage has been read, we don't know if there's a session.
  // Rendering routes before that causes guards to redirect logged-in users.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("autoflow_tenant");
    if (saved) {
      try {
        setTenant(JSON.parse(saved));
      } catch {
        localStorage.removeItem("autoflow_tenant");
      }
    }
    setReady(true);
  }, []);

  function handleAuth(tenantData, token) {
    localStorage.setItem("autoflow_token", token);
    localStorage.setItem("autoflow_tenant", JSON.stringify(tenantData));
    setTenant(tenantData);
  }

  function handleLogout() {
    // api.logout revokes the refresh token server-side, then clears storage.
    api.logout().finally(function () {
      setTenant(null);
    });
  }

  function handleTenantUpdate(updated) {
    localStorage.setItem("autoflow_tenant", JSON.stringify(updated));
    setTenant(updated);
  }

  if (!ready) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            tenant ? <Navigate to="/" replace /> : <Login onAuth={handleAuth} />
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute tenant={tenant}>
              <Templates tenant={tenant} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/:slug"
          element={
            <ProtectedRoute tenant={tenant}>
              <Config tenant={tenant} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute tenant={tenant}>
              <Settings
                tenant={tenant}
                onLogout={handleLogout}
                onUpdate={handleTenantUpdate}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute tenant={tenant}>
              <AdminOverview tenant={tenant} onLogout={handleLogout} />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tenants/:id"
          element={
            <AdminRoute tenant={tenant}>
              <AdminTenantDetail />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
