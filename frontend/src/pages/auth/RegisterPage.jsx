import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../store/slices/authSlice";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student"
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === "admin" ? "/admin" : "/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    dispatch(registerUser(formData));
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Create your Student OS account</h1>
        <p className="mt-1 text-sm text-gray-600">Set up your role-specific placement workspace.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input id="register-name" label="Full name" name="fullName" value={formData.fullName} onChange={handleChange} required />
          <Input id="register-email" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
          <Input
            id="register-password"
            label="Password"
            name="password"
            type="password"
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            required
          />
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Role</span>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-gray-700">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default RegisterPage;
