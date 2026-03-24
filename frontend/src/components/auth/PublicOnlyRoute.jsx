import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  }

  return children;
}

export default PublicOnlyRoute;
