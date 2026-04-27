import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

export default function AuthForm({ registerMode = false }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(USER_ROLES.STUDENT);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  if (user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let stage = "login";
    try {
      if (registerMode) {
        stage = "register";
        await register({ username, password, role });
        stage = "auto-login";
      }
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (stage === "auto-login") {
        setError(`Account created, but automatic sign-in failed: ${err.message}. You can sign in manually.`);
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <Layout>
      <form className="card" onSubmit={onSubmit}>
        <h2>{registerMode ? "Register" : "Login"}</h2>
        {error && <p className="error">{error}</p>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {registerMode && (
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value={USER_ROLES.STUDENT}>Student</option>
              <option value={USER_ROLES.TEACHER}>Teacher</option>
            </select>
          </label>
        )}
        <button type="submit">{registerMode ? "Create Account" : "Login"}</button>
        <p>
          {registerMode ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={registerMode ? ROUTES.LOGIN : ROUTES.REGISTER}>
            {registerMode ? "Login" : "Register"}
          </Link>
        </p>
      </form>
    </Layout>
  );
}