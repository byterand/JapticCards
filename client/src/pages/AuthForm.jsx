import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

const AUTH_STAGES = {
  LOGIN: "login",
  REGISTER: "register",
  AUTO_LOGIN: "auto-login"
};

const ROLE_OPTIONS = [
  {
    value: USER_ROLES.STUDENT,
    label: "Student",
    description: "Build your own decks or study decks assigned by a teacher."
  },
  {
    value: USER_ROLES.TEACHER,
    label: "Teacher",
    description: "Build decks and assign them to students for class use."
  }
];

export default function AuthForm({ registerMode = false }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(USER_ROLES.STUDENT);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  if (user) {
    return <Navigate to={from} replace />;
  }

  const onChange = (setter) => (e) => {
    if (error) setError("");
    setter(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (registerMode && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
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
  const switchPrompt = registerMode ? "Already have an account?" : "Need an account?";
  const switchTo = registerMode ? ROUTES.LOGIN : ROUTES.REGISTER;
  const switchLabel = registerMode ? "Login" : "Register";

  const brandTitle = registerMode ? "Create your account" : "Welcome back";
  const brandBody = registerMode
    ? "Sign up to start building decks, studying in multiple modes, and tracking your progress per card."
    : "Sign in to pick up where you left off.";

  return (
    <div className="auth-shell">
      <header className="header">
        <h1>
          <Link to={ROUTES.LANDING} className="brand">Japtic Cards</Link>
        </h1>
        <nav>
          <Link to={switchTo} className="btn">{switchLabel}</Link>
        </nav>
      </header>

      <main className="auth-main">
        <section className="auth-brand">
          <h2 className="auth-brand-title">{brandTitle}</h2>
          <p className="auth-brand-body">{brandBody}</p>
        </section>

        <form className="card auth-card" onSubmit={onSubmit}>
          {error && <p className="error">{error}</p>}

          <label>
            Username
            <input
              value={username}
              onChange={onChange(setUsername)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={onChange(setPassword)}
                autoComplete={registerMode ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {registerMode && (
            <label>
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={onChange(setConfirmPassword)}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {registerMode && (
            <fieldset className="role-fieldset">
              <legend className="role-legend">Role</legend>
              <div className="role-cards">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`role-card${role === opt.value ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                    />
                    <span className="role-card-label">{opt.label}</span>
                    <span className="role-card-description">{opt.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button type="submit" className="btn btn-primary auth-submit">
            {submitLabel}
          </button>

          <p className="auth-switch-prose">
            {switchPrompt} <Link to={switchTo}>{switchLabel}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
