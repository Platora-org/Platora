import { Navigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();

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

