import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ImportDeckForm from "../components/ImportDeckForm";
import useConfirm from "../hooks/useConfirm";
import { api } from "../services/api";

export default function DashboardPage() {
  const [decks, setDecks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [exportFormats, setExportFormats] = useState({});
  const { confirm, modal } = useConfirm();

  const setExportFormat = (deckId, format) =>
    setExportFormats((prev) => ({ ...prev, [deckId]: format }));

  const loadDecks = async () => {
    try {
      const list = await api.getDecks();
      setDecks(list);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExport = async (deck) => {
    setError("");
    const format = (exportFormats[deck._id] || "json").toLowerCase();
    try {
      const content = await api.exportDeck(deck._id, format);
      const blobType = format === "csv" ? "text/csv" : "application/json";
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

  const handleDelete = async (deck) => {
    const ok = await confirm({
      title: "Delete deck?",
      message: `"${deck.title}" and all of its cards will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    try {
      await api.deleteDeck(deck._id);
      await loadDecks();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const filtered = decks.filter((deck) => {
    const matchesSearch = deck.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? deck.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(decks.map((deck) => deck.category).filter(Boolean))
  );

  return (
    <Layout>
      <div className="grid">
        <section className="card">
          <h2>Create Deck</h2>
          {error && <p className="error">{error}</p>}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.createDeck({
                title,
                description,
                category,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
              });
              setTitle("");
              setDescription("");
              setCategory("");
              setTags("");
              await loadDecks();
            }}
          >
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Category
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label>
              Tags (comma-separated)
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
            <button type="submit">Create Deck</button>
          </form>
        </section>

        <section className="card">
          <h2>Your Decks</h2>
          <div className="filters">
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
          {filtered.length === 0 && <p>No results found.</p>}
          {filtered.map((deck) => (
            <article key={deck._id} className="deckRow">
              <div>
                <strong>{deck.title}</strong> {deck.category ? `(${deck.category})` : ""}
                <p>{deck.description}</p>
                {deck.readOnly && <small>Assigned deck (read-only)</small>}
              </div>
              <div className="actions">
                <Link to={`/decks/${deck._id}`}>Open</Link>
                <Link to={`/study/${deck._id}`}>Study</Link>
                <span className="exportGroup">
                  <select
                    aria-label="Export format"
                    value={exportFormats[deck._id] || "json"}
                    onChange={(e) => setExportFormat(deck._id, e.target.value)}
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                  <button type="button" onClick={() => handleExport(deck)}>
                    Export
                  </button>
                </span>
                {!deck.readOnly && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleDelete(deck)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>

      <section className="card">
        <h2>Import Deck</h2>
        <ImportDeckForm onImported={loadDecks} />
      </section>
      {modal}
    </Layout>
  );
}