import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { USER_ROLES } from "../constants";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <header className="header">
        <h1>Japtic Cards</h1>
        {user && (
          <nav>
            <Link to="/">Dashboard</Link>
            {user.role === USER_ROLES.TEACHER && <Link to="/teacher">Teacher</Link>}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </nav>
        )}
      </header>
      <main className="page">{children}</main>
    </div>
  );
}