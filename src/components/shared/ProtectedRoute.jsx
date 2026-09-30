import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    if (user.role === "CITIZEN") return <Navigate to="/citizen" replace />;
    if (user.role === "VOLUNTEER") return <Navigate to="/volunteer" replace />;
    if (user.role === "NGO") return <Navigate to="/ngo" replace />;
    if (user.role === "AUTHORITY") return <Navigate to="/command" replace />;
  }

  return children;
}

export default ProtectedRoute;

