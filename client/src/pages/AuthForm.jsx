import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";
import styles from "./AuthForm.module.css";

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
    let registered = false;
    try {
      if (registerMode) {
        await register({ username, password, role });
        registered = true;
      }
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(registered
        ? `Account created, but automatic sign-in failed: ${err.message}. You can sign in manually.`
        : err.message);
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
    <div className={styles.authShell}>
      <header className="header">
        <h1>
          <Link to={ROUTES.LANDING} className="brand">Japtic Cards</Link>
        </h1>
        <nav>
          <Link to={switchTo} className="btn">{switchLabel}</Link>
        </nav>
      </header>

      <main className={styles.authMain}>
        <section className={styles.authBrand}>
          <h2 className={styles.authBrandTitle}>{brandTitle}</h2>
          <p className={styles.authBrandBody}>{brandBody}</p>
        </section>

        <form className={`card ${styles.authCard}`} onSubmit={onSubmit}>
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
            <div className={styles.passwordField}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={onChange(setPassword)}
                autoComplete={registerMode ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className={styles.togglePw}
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
            <fieldset className={styles.roleFieldset}>
              <legend className={styles.roleLegend}>Role</legend>
              <div className={styles.roleCards}>
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`${styles.roleCard}${role === opt.value ? ` ${styles.isSelected}` : ""}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                    />
                    <span className={styles.roleCardLabel}>{opt.label}</span>
                    <span className={styles.roleCardDescription}>{opt.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button type="submit" className={`btn btn-primary ${styles.authSubmit}`}>
            {submitLabel}
          </button>

          <p className={styles.authSwitchProse}>
            {switchPrompt} <Link to={switchTo}>{switchLabel}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
