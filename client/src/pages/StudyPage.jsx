import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../services/api";
import { CARD_SIDES, CARD_STATUS, STUDY_MODES } from "../constants";

export default function StudyPage() {
  const { id } = useParams();
  const [mode, setMode] = useState(STUDY_MODES.FLIP);
  const [sideFirst, setSideFirst] = useState(CARD_SIDES.FRONT);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [result, setResult] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const current = session?.questions?.[index];

  // Reset per-card state when navigating between cards or starting a new session
  useEffect(() => {
    setFlipped(false);
    setTypedAnswer("");
    setResult("");
  }, [index, session?.sessionId]);

  const start = useCallback(async () => {
    if (starting) return;
    setError("");
    setStarting(true);
    try {
      const res = await api.createSession({ deckId: id, mode, sideFirst, needsReviewOnly });
      setSession(res);
      setIndex(0);
      setStats(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }, [starting, id, mode, sideFirst, needsReviewOnly]);

  const submitAnswer = useCallback(async (payload) => {
    if (!session || !current) return;
    setError("");
    try {
      const res = await api.answerSession(session.sessionId, {
        cardId: current.cardId,
        ...payload
      });
      setResult(res.isCorrect ? "Correct" : `Incorrect (expected: ${res.expected})`);
      const statRes = await api.getStats(id);
      setStats(statRes);
    } catch (err) {
      setError(err.message);
    }
  }, [session, current, id]);

  const updateCardStatus = useCallback(async (status) => {
    if (!current) return;
    setError("");
    try {
      await api.setCardStatus(id, current.cardId, status);
    } catch (err) {
      setError(err.message);
    }
  }, [current, id]);

  const toggleShuffleHandler = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
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
    } catch (err) {
      setError(err.message);
    }
  }, [session]);

  return (
    <Layout>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>Study Session</h2>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value={STUDY_MODES.FLIP}>Flip</option>
            <option value={STUDY_MODES.MULTIPLE_CHOICE}>Multiple Choice</option>
            <option value={STUDY_MODES.TRUE_FALSE}>True/False</option>
            <option value={STUDY_MODES.WRITTEN_ANSWER}>Written Answer</option>
          </select>
        </label>
        <label>
          First side
          <select value={sideFirst} onChange={(e) => setSideFirst(e.target.value)}>
            <option value={CARD_SIDES.FRONT}>Front</option>
            <option value={CARD_SIDES.BACK}>Back</option>
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
        <button type="button" onClick={start} disabled={starting}>
          {starting ? "Starting..." : "Start Session"}
        </button>
      </section>

      {session && current && (
        <section className="card">
          <p>Card {index + 1} of {session.questions.length}</p>
          {mode === STUDY_MODES.FLIP && (
            <button
              type="button"
              className="flashcard"
              onClick={() => setFlipped((f) => !f)}
            >
              {sideFirst === CARD_SIDES.FRONT
                ? (flipped ? current.back : current.front)
                : (flipped ? current.front : current.back)}
            </button>
          )}
          {mode === STUDY_MODES.MULTIPLE_CHOICE && (
            <div>
              <p>{current.prompt}</p>
              {current.options.map((opt, idx) => (
                <button
                  key={`${current.cardId}-${idx}`}
                  type="button"
                  onClick={() => submitAnswer({ selectedOption: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {mode === STUDY_MODES.TRUE_FALSE && (
            <div>
              <p>{current.statement}</p>
              <button
                type="button"
                onClick={() => submitAnswer({ answer: current.statement, isTrue: true })}
              >
                True
              </button>
              <button
                type="button"
                onClick={() => submitAnswer({ answer: current.statement, isTrue: false })}
              >
                False
              </button>
            </div>
          )}
          {mode === STUDY_MODES.WRITTEN_ANSWER && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer({ answer: typedAnswer });
              }}
            >
              <p>{current.prompt}</p>
              <input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
              />
              <button type="submit">Submit</button>
            </form>
          )}

          <p>{result}</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) =>
                Math.min(session.questions.length - 1, i + 1)
              )}
            >
              Next
            </button>
            <button type="button" onClick={toggleShuffleHandler}>
              {session.shuffleEnabled ? "Unshuffle" : "Shuffle"}
            </button>
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={() => updateCardStatus(CARD_STATUS.KNOWN)}
            >
              Known
            </button>
            <button
              type="button"
              onClick={() => updateCardStatus(CARD_STATUS.STILL_LEARNING)}
            >
              Still Learning
            </button>
            <button
              type="button"
              onClick={() => updateCardStatus(CARD_STATUS.NEEDS_REVIEW)}
            >
              Needs Review
            </button>
          </div>
        </section>
      )}

      {stats && (
        <section className="card">
          <h3>Stats</h3>
          <p>Cards Studied: {stats.cardsStudied}</p>
          <p>Total Attempts: {stats.totalAttempts}</p>
          <p>Accuracy: {(stats.accuracyRate * 100).toFixed(1)}%</p>
        </section>
      )}
    </Layout>
  );
}