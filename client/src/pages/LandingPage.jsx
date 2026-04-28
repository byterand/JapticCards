import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants";
import styles from "./LandingPage.module.css";

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
    title: "Share via export",
    body: "Export any deck to JSON or CSV and import it into another account."
  }
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <Layout>
      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>A flashcard platform for classes and self-study</h2>
        <p className={styles.heroSub}>
          Japtic Cards is a flashcard platform for self-study and classes. Build your own decks, study them in multiple modes, and track your progress per card.
        </p>
        <div className={styles.heroActions}>
          {loading ? null : user ? (
            <Link className="btn btn-primary" to={ROUTES.DASHBOARD}>
              Go to dashboard
            </Link>
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

      <section className={styles.landingSection}>
        <h3 className={styles.sectionTitle}>What's inside</h3>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h4 style={{ marginTop: 0 }}>{f.title}</h4>
              <p style={{ margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.landingSection}>
        <h3 className={styles.sectionTitle}>How it works</h3>
        <ol className={styles.steps}>
          <li>Sign up with a username and password.</li>
          <li>Build a deck, or import one someone shared with you as a JSON or CSV file.</li>
          <li>Pick a study mode and run a session; the server records what you got right and wrong.</li>
          <li>Check stats to see which cards still need work.</li>
        </ol>
      </section>
    </Layout>
  );
}