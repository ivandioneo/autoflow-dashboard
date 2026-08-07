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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = localStorage.getItem("autoflow_token");
      if (!token) {
        localStorage.removeItem("autoflow_tenant");
        if (active) setReady(true);
        return;
      }

      try {
        const current = await api.getMe();
        const currentTenant = current && (current.tenant || current);
        if (!currentTenant || !currentTenant.id) {
          throw new Error("Invalid session profile");
        }
        localStorage.setItem("autoflow_tenant", JSON.stringify(currentTenant));
        if (active) setTenant(currentTenant);
      } catch {
        localStorage.removeItem("autoflow_tenant");
        if (active) setTenant(null);
      } finally {
        if (active) setReady(true);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function handleAuth(tenantData) {
    localStorage.setItem("autoflow_tenant", JSON.stringify(tenantData));
    setTenant(tenantData);
  }

  function handleLogout() {
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
        <Route path="/login" element={tenant ? <Navigate to="/" replace /> : <Login onAuth={handleAuth} />} />
        <Route path="/" element={<ProtectedRoute tenant={tenant}><Templates tenant={tenant} onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/config/:slug" element={<ProtectedRoute tenant={tenant}><Config tenant={tenant} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute tenant={tenant}><Settings tenant={tenant} onLogout={handleLogout} onUpdate={handleTenantUpdate} /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute tenant={tenant}><AdminOverview tenant={tenant} onLogout={handleLogout} /></AdminRoute>} />
        <Route path="/admin/tenants/:id" element={<AdminRoute tenant={tenant}><AdminTenantDetail /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
