import { useEffect, useMemo, useState, createContext, useContext, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams
} from "react-router-dom";
import { api } from "./services/api";

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt silent re-auth via the httpOnly refresh cookie
    api.restoreSession()
      .then((restoredUser) => {
        if (restoredUser) setUser(restoredUser);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(username, password) {
      const res = await api.login({ username, password });
      setUser(res.user);
    },
    async register(payload) {
      await api.register(payload);
    },
    async logout() {
      try {
        await api.logout();
      } catch (err) {
        // Ignore API logout error and clear local state anyway.
      }
      setUser(null);
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="page">Loading...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <header className="header">
        <h1>Japtic Cards</h1>
        {user && (
          <nav>
            <Link to="/">Dashboard</Link>
            {user.role === "teacher" && <Link to="/teacher">Teacher</Link>}
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

function AuthForm({ registerMode = false }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
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
      navigate("/");
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {registerMode && (
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
        )}
        <button type="submit">{registerMode ? "Create Account" : "Login"}</button>
        <p>
          {registerMode ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={registerMode ? "/login" : "/register"}>{registerMode ? "Login" : "Register"}</Link>
        </p>
      </form>
    </Layout>
  );
}

function DashboardPage() {
  const [decks, setDecks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  const loadDecks = async () => {
    try {
      const list = await api.getDecks();
      setDecks(list);
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

  const categories = Array.from(new Set(decks.map((deck) => deck.category).filter(Boolean)));

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
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button type="button" onClick={() => { setSearch(""); setCategoryFilter(""); }}>
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
                <button
                  type="button"
                  onClick={async () => {
                    const format = window.prompt("Export as json or csv?", "json");
                    if (!format) return;
                    const content = await api.exportDeck(deck._id, format);
                    const blobType = format.toLowerCase() === "csv" ? "text/csv" : "application/json";
                    const blob = new Blob([content], { type: blobType });
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = `${deck.title || "deck"}.${format.toLowerCase()}`;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </button>
                {!deck.readOnly && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.deleteDeck(deck._id);
                      await loadDecks();
                    }}
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
    </Layout>
  );
}

function ImportDeckForm({ onImported }) {
  const [format, setFormat] = useState("json");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const file = e.target.file.files[0];
        if (!file) return;
        const content = await file.text();
        try {
          await api.importDeck({ format, content });
          e.target.reset();
          onImported();
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      {error && <p className="error">{error}</p>}
      <label>
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </label>
      <input type="file" name="file" required />
      <button type="submit">Import</button>
    </form>
  );
}

function DeckPage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState("");
  const [backImage, setBackImage] = useState("");
  const [error, setError] = useState("");

  const loadDeck = useCallback(async () => {
    try {
      const data = await api.getDeck(id);
      setDeck(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setCategory(data.category || "");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  async function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (!deck) {
    return <Layout>{error ? <p className="error">{error}</p> : <p>Loading deck...</p>}</Layout>;
  }

  return (
    <Layout>
      <section className="card">
        <h2>{deck.title}</h2>
        <p>{deck.description}</p>
        <p><strong>Category:</strong> {deck.category || "None"}</p>
        {!deck.readOnly && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.updateDeck(deck._id, { title, description, category });
              await loadDeck();
            }}
          >
            <h3>Edit Deck</h3>
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
            <button type="submit">Save Deck</button>
          </form>
        )}
      </section>

      {!deck.readOnly && (
        <section className="card">
          <h3>Add Card</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.addCard(deck._id, { front, back, frontImage, backImage });
              setFront("");
              setBack("");
              setFrontImage("");
              setBackImage("");
              e.target.reset();
              await loadDeck();
            }}
          >
            <label>
              Front
              <input value={front} onChange={(e) => setFront(e.target.value)} required />
            </label>
            <label>
              Back
              <input value={back} onChange={(e) => setBack(e.target.value)} required />
            </label>
            <label>
              Front Image
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  if (e.target.files[0]) setFrontImage(await toBase64(e.target.files[0]));
                }}
              />
            </label>
            <label>
              Back Image
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  if (e.target.files[0]) setBackImage(await toBase64(e.target.files[0]));
                }}
              />
            </label>
            <button type="submit">Add Card</button>
          </form>
        </section>
      )}

      <section className="card">
        <h3>Cards</h3>
        {deck.cards?.map((card) => (
          <CardEditor
            key={card._id}
            card={card}
            deckId={deck._id}
            readOnly={deck.readOnly}
            onSaved={loadDeck}
          />
        ))}
      </section>
    </Layout>
  );
}

function CardEditor({ card, deckId, readOnly, onSaved }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  return (
    <article className="cardRow">
      <div>
        <strong>{card.front}</strong> -> {card.back}
        {card.frontImage && <img src={card.frontImage} alt="Front visual" className="thumb" />}
        {card.backImage && <img src={card.backImage} alt="Back visual" className="thumb" />}
      </div>
      {!readOnly && (
        <div className="actions">
          <input value={front} onChange={(e) => setFront(e.target.value)} />
          <input value={back} onChange={(e) => setBack(e.target.value)} />
          <button type="button" onClick={async () => { await api.updateCard(deckId, card._id, { front, back }); onSaved(); }}>
            Save
          </button>
          <button type="button" onClick={async () => { await api.deleteCard(deckId, card._id); onSaved(); }}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

function StudyPage() {
  const { id } = useParams();
  const [mode, setMode] = useState("flip");
  const [sideFirst, setSideFirst] = useState("front");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [result, setResult] = useState("");
  const [stats, setStats] = useState(null);

  const current = session?.questions?.[index];

  const start = async () => {
    const res = await api.createSession({ deckId: id, mode, sideFirst, needsReviewOnly });
    setSession(res);
    setIndex(0);
    setFlipped(false);
    setResult("");
    const statRes = await api.getStats(id);
    setStats(statRes);
  };

  const submitAnswer = async (payload) => {
    if (!session || !current) return;
    const res = await api.answerSession(session.sessionId, { cardId: current.cardId, ...payload });
    setResult(res.isCorrect ? "Correct" : `Incorrect (expected: ${res.expected})`);
    const statRes = await api.getStats(id);
    setStats(statRes);
  };

  return (
    <Layout>
      <section className="card">
        <h2>Study Session</h2>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="flip">Flip</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="written_answer">Written Answer</option>
          </select>
        </label>
        <label>
          First side
          <select value={sideFirst} onChange={(e) => setSideFirst(e.target.value)}>
            <option value="front">Front</option>
            <option value="back">Back</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsReviewOnly}
            onChange={(e) => setNeedsReviewOnly(e.target.checked)}
          />
          Needs Review Only
        </label>
        <button type="button" onClick={start}>Start Session</button>
      </section>

      {session && current && (
        <section className="card">
          <p>Card {index + 1} of {session.questions.length}</p>
          {mode === "flip" && (
            <button type="button" className="flashcard" onClick={() => setFlipped((f) => !f)}>
              {sideFirst === "front"
                ? (flipped ? current.back : current.front)
                : (flipped ? current.front : current.back)}
            </button>
          )}
          {mode === "multiple_choice" && (
            <div>
              <p>{current.prompt}</p>
              {current.options.map((opt) => (
                <button key={opt} type="button" onClick={() => submitAnswer({ selectedOption: opt })}>{opt}</button>
              ))}
            </div>
          )}
          {mode === "true_false" && (
            <div>
              <p>{current.statement}</p>
              <button type="button" onClick={() => submitAnswer({ answer: current.statement, isTrue: true })}>True</button>
              <button type="button" onClick={() => submitAnswer({ answer: current.statement, isTrue: false })}>False</button>
            </div>
          )}
          {mode === "written_answer" && (
            <form onSubmit={(e) => { e.preventDefault(); submitAnswer({ answer: typedAnswer }); }}>
              <p>{current.prompt}</p>
              <input value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)} />
              <button type="submit">Submit</button>
            </form>
          )}

          <p>{result}</p>
          <div className="actions">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))}>Previous</button>
            <button type="button" onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}>Next</button>
            <button type="button" onClick={async () => {
              const enabled = !session.shuffleEnabled;
              const shuffleRes = await api.toggleShuffle(session.sessionId, enabled);
              const orderMap = new Map(
                session.questions.map((q) => [String(q.cardId), q])
              );
              const reorderedQuestions = shuffleRes.cardOrder
                .map((cardId) => orderMap.get(String(cardId)))
                .filter(Boolean);
              setSession({
                ...session,
                shuffleEnabled: shuffleRes.shuffleEnabled,
                questions: reorderedQuestions
              });
              setIndex(0);
            }}>
              {session.shuffleEnabled ? "Unshuffle" : "Shuffle"}
            </button>
          </div>
          <div className="actions">
            <button type="button" onClick={() => api.setCardStatus(id, current.cardId, "known")}>Known</button>
            <button type="button" onClick={() => api.setCardStatus(id, current.cardId, "still_learning")}>Still Learning</button>
            <button type="button" onClick={() => api.setCardStatus(id, current.cardId, "needs_review")}>Needs Review</button>
          </div>
        </section>
      )}

      {stats && (
        <section className="card">
          <h3>Stats</h3>
          <p>Cards Studied: {stats.cardsStudied}</p>
          <p>Accuracy: {Math.round(stats.accuracyRate * 100)}%</p>
        </section>
      )}
    </Layout>
  );
}

function TeacherPage() {
  const [students, setStudents] = useState([]);
  const [decks, setDecks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  async function load() {
    const [studentList, deckList, assignmentList] = await Promise.all([
      api.getStudents(),
      api.getDecks(),
      api.getAssignments()
    ]);
    setStudents(studentList);
    setDecks(deckList.filter((d) => d.access === "owner"));
    setAssignments(assignmentList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <section className="card">
        <h2>Assign Decks</h2>
        <label>
          Deck
          <select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}>
            <option value="">Choose deck</option>
            {decks.map((deck) => <option key={deck._id} value={deck._id}>{deck.title}</option>)}
          </select>
        </label>
        <p>Students</p>
        {students.map((student) => (
          <label key={student._id} className="checkbox">
            <input
              type="checkbox"
              checked={selectedStudents.includes(student._id)}
              onChange={(e) => {
                setSelectedStudents((prev) => e.target.checked
                  ? [...prev, student._id]
                  : prev.filter((id) => id !== student._id));
              }}
            />
            {student.username}
          </label>
        ))}
        <button
          type="button"
          onClick={async () => {
            await api.assignDeck({ deckId: selectedDeck, studentIds: selectedStudents });
            setSelectedStudents([]);
            await load();
          }}
        >
          Assign
        </button>
      </section>

      <section className="card">
        <h3>Current Assignments</h3>
        {assignments.map((assignment) => (
          <article key={assignment._id} className="deckRow">
            <span>{assignment.deck?.title} -> {assignment.student?.username}</span>
            <button type="button" onClick={async () => { await api.revokeAssignment(assignment._id); await load(); }}>
              Revoke
            </button>
          </article>
        ))}
      </section>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm />} />
      <Route path="/register" element={<AuthForm registerMode />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/decks/:id" element={<ProtectedRoute><DeckPage /></ProtectedRoute>} />
      <Route path="/study/:id" element={<ProtectedRoute><StudyPage /></ProtectedRoute>} />
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
