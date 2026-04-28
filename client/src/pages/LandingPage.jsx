import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES, USER_ROLES } from "../constants";

const FEATURES = [
  {
    title: "Build decks your way",
    body: "Create titled, categorized decks with tags, then add cards with text or optional images on each side."
  },
  {
    title: "Four study modes",
    body: "Drill cards with classic flip, multiple choice, true/false, or written answer. Switch between modes at your convenience."
  },
  {
    title: "Track what sticks",
    body: "Per-card status and per-deck stats show what you know, what's still learning, and what needs review."
  },
  {
    title: "Teacher tools",
    body: "Teachers can author decks once and assign them to any number of students with read-only access."
  }
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <Layout>
      <section className="hero">
        <h2 className="hero-title">A flashcard platform for classes and self-study</h2>
        <p className="hero-sub">
          Japtic Cards is a flashcard platform for self-study and classes. Build your own decks, study them in multiple modes, and track your progress per card &mdash; students can also work through decks assigned by their teachers.
        </p>
        <div className="hero-actions">
          {loading ? null : user ? (
            <>
              <Link className="btn btn-primary" to={ROUTES.DASHBOARD}>
                Go to dashboard
              </Link>
              {user.role === USER_ROLES.TEACHER && (
                <Link className="btn" to={ROUTES.TEACHER}>
                  Teacher tools
                </Link>
              )}
            </>
          ) : (
            <>
              <Link className="btn btn-primary" to={ROUTES.REGISTER}>
                Create an account
              </Link>
              <Link className="btn" to={ROUTES.LOGIN}>
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <h3 className="section-title">What's inside</h3>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h4 style={{ marginTop: 0 }}>{f.title}</h4>
              <p style={{ margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h3 className="section-title">How it works</h3>
        <ol className="steps">
          <li>Sign up as a student or teacher.</li>
          <li>Build a deck — or, as a student, study one assigned to you.</li>
          <li>Pick a study mode and run a session; the server records what you got right and wrong.</li>
          <li>Check stats to see which cards still need work.</li>
        </ol>
      </section>
    </Layout>
  );
}