import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="page">Loading...</p>;
  }
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return children;
}