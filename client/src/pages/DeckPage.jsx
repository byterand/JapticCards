import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import CardEditor from "../components/CardEditor";
import ExportMenu from "../components/ExportMenu";
import AddCardModal from "../components/AddCardModal";
import EditDeckModal from "../components/EditDeckModal";
import useConfirm from "../hooks/useConfirm";
import { api } from "../services/api";
import {
  CARD_SIDES,
  CARD_SIDE_LABELS,
  CONTENT_TYPE_BY_FORMAT,
  CONTENT_TYPES,
  STUDY_MODES,
  STUDY_MODE_LABELS,
  buildPath
} from "../constants";
import styles from "./DeckPage.module.css";

function buildStudyUrl(deckId, mode, sideFirst, needsReviewOnly) {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (sideFirst) params.set("side", sideFirst);
  if (needsReviewOnly) params.set("review", "1");
  const qs = params.toString();
  return qs ? `${buildPath.study(deckId)}?${qs}` : buildPath.study(deckId);
}

export default function DeckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, modal } = useConfirm();

  const [deck, setDeck] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const [editDeckOpen, setEditDeckOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const [mode, setMode] = useState(STUDY_MODES.FLIP);
  const [sideFirst, setSideFirst] = useState(CARD_SIDES.FRONT);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  const loadDeck = useCallback(async () => {
    try {
      const data = await api.getDeck(id);
      setDeck(data);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getStats(id);
      setStats(s);
    } catch (err) {
      // Stats are best-effort; surface but don't block the page.
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
    loadStats();
  }, [loadDeck, loadStats]);

  const handleCardChanged = () => {
    loadDeck();
    loadStats();
  };

  const handleExport = async (format) => {
    setError("");
    try {
      const content = await api.exportDeck(deck._id, format);
      const blobType = CONTENT_TYPE_BY_FORMAT[format] || CONTENT_TYPES.JSON;
      const blob = new Blob([content], { type: blobType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${deck.title || "deck"}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete deck?",
      message: `"${deck.title}" and all of its cards will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    try {
      await api.deleteDeck(deck._id);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const studyUrl = useMemo(
    () => deck ? buildStudyUrl(deck._id, mode, sideFirst, needsReviewOnly) : "#",
    [deck, mode, sideFirst, needsReviewOnly]
  );

  if (!deck) {
    return (
      <Layout>
        {error ? <p className="error">{error}</p> : <p>Loading deck...</p>}
      </Layout>
    );
  }

  const cardCount = deck.cards?.length || 0;
  const accuracyPct = stats && stats.totalAttempts
    ? `${Math.round(stats.accuracyRate * 1000) / 10}%`
    : "—";

  return (
    <Layout>
      {error && <p className="error">{error}</p>}

      <section className={`card ${styles.headerCard}`}>
        <div className={styles.headerTop}>
          <div className={styles.titleBlock}>
            <div className={styles.titleHead}>
              <h2>{deck.title}</h2>
              <div className={styles.pillRow}>
                {deck.category && <span className={styles.pill}>{deck.category}</span>}
                {deck.readOnly && <span className={`${styles.pill} ${styles.muted}`}>Assigned · read-only</span>}
                {Array.isArray(deck.tags) && deck.tags.map((t) => (
                  <span key={t} className={`${styles.pill} ${styles.muted}`}>{t.toLowerCase()}</span>
                ))}
              </div>
            </div>
            {deck.description && <p className={styles.tagline}>{deck.description}</p>}
          </div>
          <div className="actions">
            {!deck.readOnly && (
              <button type="button" className="btn" onClick={() => setEditDeckOpen(true)}>
                Edit
              </button>
            )}
            <ExportMenu onExport={handleExport} />
            {!deck.readOnly && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      </section>

      <div className={styles.shell}>
        <section className="card">
          <h3>Study setup</h3>
          <div className={styles.setupRow}>
            <label>
              Mode
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {Object.values(STUDY_MODES).map((m) => (
                  <option key={m} value={m}>{STUDY_MODE_LABELS[m]}</option>
                ))}
              </select>
            </label>
            <label>
              First side
              <select value={sideFirst} onChange={(e) => setSideFirst(e.target.value)}>
                {Object.values(CARD_SIDES).map((s) => (
                  <option key={s} value={s}>{CARD_SIDE_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={needsReviewOnly}
              onChange={(e) => setNeedsReviewOnly(e.target.checked)}
            />
            Needs review only
          </label>
          <div className={styles.startRow}>
            <Link to={studyUrl} className="btn btn-primary">Start study session</Link>
          </div>
        </section>

        <section className="card">
          <h3>Stats</h3>
          {!stats ? (
            <p>Loading stats...</p>
          ) : (
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Cards studied</p>
                <p className={styles.statValue}>{stats.cardsStudied}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Attempts</p>
                <p className={styles.statValue}>{stats.totalAttempts}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Correct</p>
                <p className={styles.statValue}>{stats.correctCount}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Accuracy</p>
                <p className={styles.statValue}>{accuracyPct}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className={styles.cardsHeader}>
          <h3>
            Cards<span className={styles.cardCount}>{cardCount} total</span>
          </h3>
          {!deck.readOnly && (
            <button type="button" className="btn btn-primary" onClick={() => setAddCardOpen(true)}>
              Add card
            </button>
          )}
        </div>
        {cardCount === 0 ? (
          <p>No cards yet.</p>
        ) : (
          <div className={styles.cardsGrid}>
            {deck.cards.map((card) => (
              <CardEditor
                key={card._id}
                card={card}
                deckId={deck._id}
                readOnly={deck.readOnly}
                onSaved={handleCardChanged}
                onError={setError}
              />
            ))}
          </div>
        )}
      </section>

      {!deck.readOnly && (
        <>
          <EditDeckModal
            open={editDeckOpen}
            deck={deck}
            onClose={() => setEditDeckOpen(false)}
            onSaved={loadDeck}
          />
          <AddCardModal
            open={addCardOpen}
            deckId={deck._id}
            onClose={() => setAddCardOpen(false)}
            onAdded={handleCardChanged}
          />
        </>
      )}
      {modal}
    </Layout>
  );
}
