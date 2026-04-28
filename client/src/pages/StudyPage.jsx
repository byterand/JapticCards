import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../services/api";
import {
  CARD_SIDES,
  CARD_SIDE_VALUES,
  CARD_STATUS,
  CARD_STATUS_LABELS,
  STUDY_MODES,
  STUDY_MODE_VALUES,
  STUDY_MODE_LABELS,
  buildPath
} from "../constants";
import styles from "./StudyPage.module.css";

const STATUS_BUTTONS = [
  CARD_STATUS.KNOWN,
  CARD_STATUS.STILL_LEARNING,
  CARD_STATUS.NEEDS_REVIEW
];

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function FlipCard({ current, sideFirst, flipped, onFlip }) {
  const showFront = sideFirst === CARD_SIDES.FRONT ? !flipped : flipped;
  return (
    <button type="button" className={styles.flashcard} onClick={onFlip}>
      {showFront ? current.front : current.back}
    </button>
  );
}

function MultipleChoice({ current, onAnswer, disabled }) {
  return (
    <div>
      <p>{current.prompt}</p>
      <div className={styles.choiceGrid}>
        {current.options.map((opt, idx) => (
          <button
            key={`${current.cardId}-${idx}`}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer({ selectedOption: opt })}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrueFalse({ current, onAnswer, disabled }) {
  return (
    <div>
      <p>{current.statement}</p>
      <div className={styles.choiceGrid}>
        <button type="button" disabled={disabled} onClick={() => onAnswer({ answer: current.statement, isTrue: true })}>True</button>
        <button type="button" disabled={disabled} onClick={() => onAnswer({ answer: current.statement, isTrue: false })}>False</button>
      </div>
    </div>
  );
}

function WrittenAnswer({ current, typedAnswer, setTypedAnswer, onAnswer, disabled }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer({ answer: typedAnswer });
      }}
    >
      <p>{current.prompt}</p>
      <input value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)} disabled={disabled} />
      <button type="submit" disabled={disabled}>Submit</button>
    </form>
  );
}

export default function StudyPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = pick(searchParams.get("mode"), STUDY_MODE_VALUES, STUDY_MODES.FLIP);
  const sideFirst = pick(searchParams.get("side"), CARD_SIDE_VALUES, CARD_SIDES.FRONT);
  const needsReviewOnly = searchParams.get("review") === "1";

  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [result, setResult] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const startedRef = useRef(false);

  const current = session?.questions?.[index];

  // Reset per-card state when navigating between cards or starting a new session
  useEffect(() => {
    setFlipped(false);
    setTypedAnswer("");
    setResult("");
  }, [index, session?.sessionId]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.createSession({ deckId: id, mode, sideFirst, needsReviewOnly });
        if (cancelled) return;
        setSession(res);
        setIndex(0);
        setSessionDone(false);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, mode, sideFirst, needsReviewOnly]);

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
      if (res.completed) setSessionDone(true);
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

  const toggleShuffle = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const enabled = !session.shuffleEnabled;
      const shuffleRes = await api.toggleShuffle(session.sessionId, enabled);
      const orderMap = new Map(session.questions.map((q) => [String(q.cardId), q]));
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
        return <MultipleChoice current={current} onAnswer={submitAnswer} disabled={submitting || !!result} />;
      case STUDY_MODES.TRUE_FALSE:
        return <TrueFalse current={current} onAnswer={submitAnswer} disabled={submitting || !!result} />;
      case STUDY_MODES.WRITTEN_ANSWER:
        return (
          <WrittenAnswer
            current={current}
            typedAnswer={typedAnswer}
            setTypedAnswer={setTypedAnswer}
            onAnswer={submitAnswer}
            disabled={submitting || !!result}
          />
        );
      default:
        return null;
    }
  };

  const accuracyPct = useMemo(() => {
    if (!stats || !stats.totalAttempts) return null;
    return `${Math.round(stats.accuracyRate * 1000) / 10}%`;
  }, [stats]);

  return (
    <Layout>
      <div className={styles.head}>
        <div>
          <h2 className={styles.heading}>Study session</h2>
          <p className={styles.subhead}>
            {STUDY_MODE_LABELS[mode]}
            {mode === STUDY_MODES.FLIP ? ` · ${sideFirst === CARD_SIDES.FRONT ? "front first" : "back first"}` : ""}
            {needsReviewOnly ? " · needs review only" : ""}
          </p>
        </div>
        <Link to={buildPath.deck(id)} className="btn">Back to deck</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {!session && !error && <p>Starting session...</p>}

      {session && current && (
        <section className="card">
          <p className={styles.progress}>Card {index + 1} of {session.questions.length}</p>
          {renderQuestion()}
          {result && <p className={styles.result}>{result}</p>}
          <div className="actions">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              Previous
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(session.questions.length - 1, i + 1))}
            >
              Next
            </button>
            <button type="button" onClick={toggleShuffle}>
              {session.shuffleEnabled ? "Unshuffle" : "Shuffle"}
            </button>
          </div>
          <div className="actions">
            {STATUS_BUTTONS.map((status) => (
              <button key={status} type="button" onClick={() => updateCardStatus(status)}>
                {CARD_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </section>
      )}

      {sessionDone && (
        <section className="card">
          <h3>Session complete</h3>
          <p>You've answered every card in this session.</p>
          <div className="actions">
            <Link to={buildPath.deck(id)} className="btn">Back to deck</Link>
            <Link to={buildPath.study(id)} className="btn btn-primary" reloadDocument>
              Study again
            </Link>
          </div>
        </section>
      )}

      {stats && (
        <section className="card">
          <h3>Stats</h3>
          <p>Cards studied: {stats.cardsStudied}</p>
          <p>Total attempts: {stats.totalAttempts}</p>
          {accuracyPct !== null && <p>Accuracy: {accuracyPct}</p>}
        </section>
      )}
    </Layout>
  );
}
