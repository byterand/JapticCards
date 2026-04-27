import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../services/api";
import {
  CARD_SIDES,
  CARD_SIDE_LABELS,
  CARD_STATUS,
  CARD_STATUS_LABELS,
  STUDY_MODES,
  STUDY_MODE_LABELS
} from "../constants";

const STATUS_BUTTONS = [
  CARD_STATUS.KNOWN,
  CARD_STATUS.STILL_LEARNING,
  CARD_STATUS.NEEDS_REVIEW
];

function FlipCard({ current, sideFirst, flipped, onFlip }) {
  const showFront = sideFirst === CARD_SIDES.FRONT ? !flipped : flipped;
  return (
    <button type="button" className="flashcard" onClick={onFlip}>
      {showFront ? current.front : current.back}
    </button>
  );
}

function MultipleChoice({ current, onAnswer }) {
  return (
    <div>
      <p>{current.prompt}</p>
      {current.options.map((opt, idx) => (
        <button
          key={`${current.cardId}-${idx}`}
          type="button"
          onClick={() => onAnswer({ selectedOption: opt })}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TrueFalse({ current, onAnswer }) {
  return (
    <div>
      <p>{current.statement}</p>
      <button
        type="button"
        onClick={() => onAnswer({ answer: current.statement, isTrue: true })}
      >
        True
      </button>
      <button
        type="button"
        onClick={() => onAnswer({ answer: current.statement, isTrue: false })}
      >
        False
      </button>
    </div>
  );
}

function WrittenAnswer({ current, typedAnswer, setTypedAnswer, onAnswer }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer({ answer: typedAnswer });
      }}
    >
      <p>{current.prompt}</p>
      <input
        value={typedAnswer}
        onChange={(e) => setTypedAnswer(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

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
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

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
      setSessionDone(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }, [starting, id, mode, sideFirst, needsReviewOnly]);

  const submitAnswer = useCallback(async (payload) => {
    if (!session || !current || submitting || result) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await api.answerSession(session.sessionId, {
        cardId: current.cardId,
        ...payload
      });
      setResult(res.isCorrect ? "Correct" : `Incorrect (expected: ${res.expected})`);

      if (res.completed)
        setSessionDone(true);

      const statRes = await api.getStats(id);
      setStats(statRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [session, current, id, submitting, result]);

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

  const renderQuestion = () => {
    if (!current) return null;
    switch (mode) {
      case STUDY_MODES.FLIP:
        return (
          <FlipCard
            current={current}
            sideFirst={sideFirst}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
          />
        );
      case STUDY_MODES.MULTIPLE_CHOICE:
        return <MultipleChoice current={current} onAnswer={submitAnswer} />;
      case STUDY_MODES.TRUE_FALSE:
        return <TrueFalse current={current} onAnswer={submitAnswer} />;
      case STUDY_MODES.WRITTEN_ANSWER:
        return (
          <WrittenAnswer
            current={current}
            typedAnswer={typedAnswer}
            setTypedAnswer={setTypedAnswer}
            onAnswer={submitAnswer}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>Study Session</h2>
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
          {renderQuestion()}

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
            {STATUS_BUTTONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateCardStatus(status)}
              >
                {CARD_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </section>
      )}

      {sessionDone && (
        <section className="card">
          <h3>Session Complete</h3>
          <p>You've answered every card in this session.</p>
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