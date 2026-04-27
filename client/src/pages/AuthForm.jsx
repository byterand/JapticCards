import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

export default function AuthForm({ registerMode = false }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(USER_ROLES.STUDENT);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (registerMode) {
        await register({ username, password, role });
        await login(username, password);
      } else {
        await login(username, password);
      }
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setError(err.message);
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