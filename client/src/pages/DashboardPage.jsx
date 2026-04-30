import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import CreateDeckModal from "../components/CreateDeckModal";
import ImportDeckModal from "../components/ImportDeckModal";
import DeckRow from "../components/DeckRow";
import useConfirm from "../hooks/useConfirm";
import { api } from "../services/api";
import { downloadDeckExport } from "../utils/downloadDeckExport";
import styles from "./DashboardPage.module.css";

const CONTINUE_LIMIT = 3;

export default function DashboardPage() {
  const [decks, setDecks] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { confirm, modal } = useConfirm();

  const loadDecks = useCallback(async () => {
    try {
      const list = await api.getDecks();
      setDecks(list);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleExport = useCallback(async (deck, format) => {
    setError("");
    try {
      await downloadDeckExport(deck, format);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handleDelete = useCallback(async (deck) => {
    const ok = await confirm({
      title: "Delete deck?",
      message: `"${deck.title}" and all of its cards will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true
    });

    if (!ok)
      return;

    try {
      await api.deleteDeck(deck._id);
      await loadDecks();
    } catch (err) {
      setError(err.message);
    }
  }, [confirm, loadDecks]);

  const filtered = useMemo(
    () => decks.filter((deck) => {
      const matchesSearch = deck.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter ? deck.category === categoryFilter : true;
      return matchesSearch && matchesCategory;
    }),
    [decks, search, categoryFilter]
  );

  const categories = useMemo(
    () => Array.from(new Set(decks.map((deck) => deck.category).filter(Boolean))),
    [decks]
  );

  const totals = useMemo(() => {
    return { decks: decks.length, categories: categories.length };
  }, [decks, categories]);

  const recent = useMemo(
    () => [...decks]
      .filter((d) => d.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, CONTINUE_LIMIT),
    [decks]
  );

  return (
    <Layout>
      <div className={styles.head}>
        <h2 className={styles.heading}>Your decks</h2>
        <div className={styles.headActions}>
          <button type="button" className="btn" onClick={() => setImportOpen(true)}>
            Import deck
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            New deck
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className={styles.shell}>
        <section>
          <div className={styles.filters}>
            <input
              placeholder="Search by title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("");
              }}
            >
              Clear
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className={styles.empty}>
              {decks.length === 0
                ? "No decks yet. Create your first deck or import one to get started."
                : "No decks match your filters."}
            </p>
          ) : (
            filtered.map((deck) => (
              <DeckRow
                key={deck._id}
                deck={deck}
                onExport={handleExport}
                onDelete={handleDelete}
              />
            ))
          )}
        </section>

        <aside>
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Totals</h3>
            <div className={styles.totals}>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Decks</p>
                <p className={styles.statValue}>{totals.decks}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Categories</p>
                <p className={styles.statValue}>{totals.categories}</p>
              </div>
            </div>
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Continue studying</h3>
            {recent.length === 0 ? (
              <p className={styles.empty} style={{ padding: "0.4rem 0" }}>
                No recent decks yet.
              </p>
            ) : (
              recent.map((deck) => (
                <DeckRow key={deck._id} deck={deck} variant="mini" />
              ))
            )}
          </div>
        </aside>
      </div>

      <CreateDeckModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadDecks}
      />
      <ImportDeckModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadDecks}
      />
      {modal}
    </Layout>
  );
}
