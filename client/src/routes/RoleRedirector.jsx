import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

const RoleRedirector = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      console.log("No user, redirecting to /login");
      navigate("/login", { replace: true });
      return;
    }

    switch (user.role) {
      case "admin":
        navigate("/admin/walletAnalytics", { replace: true });
        break;
      case "restaurant":
        navigate("/restaurant/wallet", { replace: true });
        break;
      case "customer":
        navigate("/", { replace: true });
        break;
      case "delivery":
        navigate("/deliveryagent", { replace: true });
        break;
      default:
        console.log("Unknown role, redirecting to /login");
        navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  return null;
};

export default RoleRedirector;
