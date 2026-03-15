import { Navigate } from "react-router-dom";

// Order flow is now on the home page
export default function NewOrder() {
  return <Navigate to="/user/home" replace />;
}
