import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Templates from "./pages/Templates";
import Config from "./pages/Config";
import Settings from "./pages/Settings";

function ProtectedRoute({ tenant, children }) {
  if (!tenant) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("autoflow_tenant");
    if (saved) {
      try {
        setTenant(JSON.parse(saved));
      } catch {
        localStorage.removeItem("autoflow_tenant");
      }
    }
  }, []);

  function handleAuth(tenantData, token) {
    localStorage.setItem("autoflow_token", token);
    localStorage.setItem("autoflow_tenant", JSON.stringify(tenantData));
    setTenant(tenantData);
  }

  function handleLogout() {
    localStorage.removeItem("autoflow_token");
    localStorage.removeItem("autoflow_tenant");
    setTenant(null);
  }

  function handleTenantUpdate(updated) {
    localStorage.setItem("autoflow_tenant", JSON.stringify(updated));
    setTenant(updated);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            tenant ? (
              <Navigate to="/" replace />
            ) : (
              <Login onAuth={handleAuth} />
            )
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
