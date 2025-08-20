import { Navigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-lg">Loading...</span>
      </div>
    );
  }

  // If no user (guest) and "guest" is allowed
  if (!user && allowedRoles.includes("guest")) {
    return children;
  }

  // If user exists and their role is allowed
  if (user && allowedRoles.includes(user.role)) {
    return children;
  }

  // Otherwise, deny access
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;

