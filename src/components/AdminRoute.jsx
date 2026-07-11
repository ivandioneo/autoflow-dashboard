import { Navigate } from "react-router-dom";

// Client-side guard only. It hides the UI from non-admins; the real
// enforcement is the role check on the backend's /admin endpoints, which
// will 403 regardless of what the browser thinks.
export default function AdminRoute({ tenant, children }) {
  if (!tenant) return <Navigate to="/login" replace />;
  if (tenant.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
