import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <header className="header">
        <h1>
          <Link to={ROUTES.LANDING} className="brand">Japtic Cards</Link>
        </h1>
        <nav>
          {user ? (
            <>
              <Link to={ROUTES.DASHBOARD} className="btn">Dashboard</Link>
              {user.role === USER_ROLES.TEACHER && (
                <Link to={ROUTES.TEACHER} className="btn">Teacher</Link>
              )}
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await logout();
                  navigate(ROUTES.LANDING);
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="btn">Login</Link>
              <Link to={ROUTES.REGISTER} className="btn btn-primary">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}