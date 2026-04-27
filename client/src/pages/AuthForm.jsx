import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

const AUTH_STAGES = {
  LOGIN: "login",
  REGISTER: "register",
  AUTO_LOGIN: "auto-login"
};

const ROLE_LABELS = {
  [USER_ROLES.STUDENT]: "Student",
  [USER_ROLES.TEACHER]: "Teacher"
};

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
    let stage = AUTH_STAGES.LOGIN;
    try {
      if (registerMode) {
        stage = AUTH_STAGES.REGISTER;
        await register({ username, password, role });
        stage = AUTH_STAGES.AUTO_LOGIN;
      }
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = stage === AUTH_STAGES.AUTO_LOGIN
        ? `Account created, but automatic sign-in failed: ${err.message}. You can sign in manually.`
        : err.message;
      setError(message);
    }
  };

  const submitLabel = registerMode ? "Create Account" : "Login";
  const heading = registerMode ? "Register" : "Login";
  const switchPrompt = registerMode ? "Already have an account?" : "Need an account?";
  const switchTo = registerMode ? ROUTES.LOGIN : ROUTES.REGISTER;
  const switchLabel = registerMode ? "Login" : "Register";

  return (
    <Layout>
      <form className="card" onSubmit={onSubmit}>
        <h2>{heading}</h2>
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
              {Object.values(USER_ROLES).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
        )}
        <button type="submit">{submitLabel}</button>
        <p>
          {switchPrompt}{" "}
          <Link to={switchTo}>{switchLabel}</Link>
        </p>
      </form>
    </Layout>
  );
}
