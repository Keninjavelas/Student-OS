import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/slices/authSlice";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, isAuthenticated, user, source } = useSelector((state) => state.auth);
  const [credentials, setCredentials] = useState({ email: "student@studentos.com", password: "student123" });

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from;
      navigate(from || (user?.role === "admin" ? "/admin" : "/"), { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    dispatch(loginUser(credentials));
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Student OS</h1>
        <p className="mt-1 text-sm text-gray-600">Sign in to access placement workflows and analytics.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            id="login-email"
            label="Email"
            name="email"
            type="email"
            value={credentials.email}
            onChange={handleChange}
            required
          />
          <Input
            id="login-password"
            label="Password"
            name="password"
            type="password"
            value={credentials.password}
            onChange={handleChange}
            required
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          {source === "mock" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Backend auth endpoint unavailable. Using mock auth accounts.
            </div>
          ) : null}

          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          <p>Demo student: student@studentos.com / student123</p>
          <p>Demo admin: admin@studentos.com / admin123</p>
        </div>

        <p className="mt-4 text-sm text-gray-700">
          New account?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default LoginPage;
