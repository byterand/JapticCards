import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api, imageUrl } from "../services/api";
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

const STATUS_CLASS = {
  [CARD_STATUS.KNOWN]: styles.statusKnown,
  [CARD_STATUS.STILL_LEARNING]: styles.statusLearning,
  [CARD_STATUS.NEEDS_REVIEW]: styles.statusReview
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function FlipCard({ current, sideFirst, flipped, suppressAnim, onFlip }) {
  const frontFirst = sideFirst === CARD_SIDES.FRONT;
  const showingBack = frontFirst ? flipped : !flipped;

  return (
    <div className={styles.scene}>
      <button
        type="button"
        className={`${styles.flipCard} ${flipped ? styles.flipped : ""} ${suppressAnim ? styles.noAnim : ""}`}
        onClick={onFlip}
        aria-label={`Flashcard showing ${showingBack ? "back" : "front"}. Click or press Space to flip.`}
      >
        <div className={`${styles.face} ${styles.faceFront}`}>
          <span className={styles.faceLabel}>{frontFirst ? "Front" : "Back"}</span>
          <div className={styles.faceBody}>
            <p className={styles.faceText}>{frontFirst ? current.front : current.back}</p>
            {(frontFirst ? current.frontImage : current.backImage) && (
              <img
                src={imageUrl(frontFirst ? current.frontImage : current.backImage)}
                alt=""
                className={styles.faceImage}
              />
            )}
          </div>
          <span className={styles.flipHint}>Click or press Space to flip</span>
        </div>
        <div className={`${styles.face} ${styles.faceBack}`}>
          <span className={styles.faceLabel}>{frontFirst ? "Back" : "Front"}</span>
          <div className={styles.faceBody}>
            <p className={styles.faceText}>{frontFirst ? current.back : current.front}</p>
            {(frontFirst ? current.backImage : current.frontImage) && (
              <img
                src={imageUrl(frontFirst ? current.backImage : current.frontImage)}
                alt=""
                className={styles.faceImage}
              />
            )}
          </div>
          <span className={styles.flipHint}>Click or press Space to flip</span>
        </div>
      </button>
    </div>
  );
}

function MultipleChoice({ current, selected, feedback, onAnswer, disabled }) {
  const answered = !!feedback;
  const expected = feedback?.expected;
  return (
    <>
      <p className={styles.prompt}>{current.prompt}</p>
      <div className={styles.optionGrid}>
        {current.options.map((opt, idx) => {
          const isSelected = selected === opt;
          const isCorrect = answered && opt === expected;
          const isWrongPick = answered && isSelected && !feedback.isCorrect;
          const isDimmed = answered && !isSelected && !isCorrect;
          const tone = isWrongPick
            ? styles.optionWrong
            : isCorrect
              ? styles.optionRight
              : "";
          return (
            <button
              key={`${current.cardId}-${idx}`}
              type="button"
              className={`${styles.optionTile} ${tone} ${isDimmed ? styles.optionDimmed : ""}`}
              disabled={disabled}
              onClick={() => onAnswer({ selectedOption: opt }, opt)}
            >
              <span className={styles.optionLetter}>{LETTERS[idx] || idx + 1}</span>
              <span className={styles.optionText}>{opt}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function TrueFalse({ current, selected, feedback, onAnswer, disabled }) {
  const answered = !!feedback;
  const correctValue = answered
    ? (feedback.isCorrect ? selected : !selected)
    : null;

  const renderTile = (value, label, icon, baseClass) => {
    const isSelected = selected === value;
    const isCorrect = answered && correctValue === value;
    const isWrongPick = answered && isSelected && !feedback.isCorrect;
    const isDimmed = answered && !isSelected && !isCorrect;
    const tone = isWrongPick
      ? styles.tfWrong
      : isCorrect
        ? styles.tfRight
        : "";
    return (
      <button
        type="button"
        className={`${styles.tfTile} ${baseClass} ${tone} ${isDimmed ? styles.tfDimmed : ""}`}
        disabled={disabled}
        onClick={() => onAnswer({ answer: current.statement, isTrue: value }, value)}
      >
        <span className={styles.tfIcon} aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <p className={styles.prompt}>{current.statement}</p>
      <div className={styles.tfGrid}>
        {renderTile(true, "True", "✓", styles.tfTrue)}
        {renderTile(false, "False", "✕", styles.tfFalse)}
      </div>
    </>
  );
}

function WrittenAnswer({ current, typedAnswer, setTypedAnswer, onAnswer, disabled }) {
  return (
    <>
      <p className={styles.prompt}>{current.prompt}</p>
      <form
        className={styles.writtenForm}
        onSubmit={(e) => {
          e.preventDefault();
          onAnswer({ answer: typedAnswer }, typedAnswer);
        }}
      >
        <input
          className={styles.writtenInput}
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer…"
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || !typedAnswer.trim()}>
          Submit
        </button>
      </form>
    </>
  );
}

function FeedbackBanner({ feedback, mode }) {
  if (!feedback) return null;
  const correct = feedback.isCorrect;
  return (
    <div className={`${styles.feedback} ${correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
      <span className={styles.feedbackBadge}>{correct ? "Correct" : "Incorrect"}</span>
      {!correct && feedback.expected != null && (
        <span className={styles.feedbackText}>
          Correct answer: <strong>{String(feedback.expected)}</strong>
        </span>
      )}
      {correct && mode === STUDY_MODES.WRITTEN_ANSWER && feedback.expected != null && (
        <span className={styles.feedbackText}>
          <strong>{String(feedback.expected)}</strong>
        </span>
      )}
    </div>
  );
}

export default function StudyPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = pick(searchParams.get("mode"), STUDY_MODE_VALUES, STUDY_MODES.FLIP);
  const sideFirst = pick(searchParams.get("side"), CARD_SIDE_VALUES, CARD_SIDES.FRONT);
  const needsReviewOnly = searchParams.get("review") === "1";
  const isFlip = mode === STUDY_MODES.FLIP;

  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [suppressFlipAnim, setSuppressFlipAnim] = useState(false);
  const [statusByCard, setStatusByCard] = useState({});

  const current = session?.questions?.[index];
  const total = session?.questions?.length || 0;
  const currentStatus = current ? statusByCard[String(current.cardId)] : undefined;
  const answered = !!feedback;

  // Reset per-card state when navigating between cards or starting a new session
  useEffect(() => {
    setFlipped(false);
    setTypedAnswer("");
    setSelected(null);
    setFeedback(null);
  }, [index, session?.sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.createSession({ deckId: id, mode, sideFirst, needsReviewOnly });
        if (cancelled) return;
        setSession(res);
        setIndex(0);
        setSessionDone(false);
        setStatusByCard({});
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, mode, sideFirst, needsReviewOnly]);

  const goPrev = useCallback(() => {
    setIndex((i) => {
      const next = Math.max(0, i - 1);
      if (next !== i) setSuppressFlipAnim(true);
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => {
      const next = Math.min(total - 1, i + 1);
      if (next !== i) setSuppressFlipAnim(true);
      return next;
    });
  }, [total]);

  useEffect(() => {
    if (!suppressFlipAnim) return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSuppressFlipAnim(false));
    });
    return () => cancelAnimationFrame(id);
  }, [suppressFlipAnim, index]);

  const flip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  useEffect(() => {
    if (!isFlip || !session) return undefined;
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlip, session, flip, goNext, goPrev]);

  const submitAnswer = useCallback(async (payload, selectedDisplay) => {
    if (!session || !current || submitting || answered) return;
    setSubmitting(true);
    setError("");
    setSelected(selectedDisplay);
    try {
      const res = await api.answerSession(session.sessionId, {
        cardId: current.cardId,
        ...payload
      });
      setFeedback({ isCorrect: res.isCorrect, expected: res.expected });
      if (res.completed) setSessionDone(true);
      const statRes = await api.getStats(id);
      setStats(statRes);
    } catch (err) {
      setError(err.message);
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }, [session, current, id, submitting, answered]);

  const updateCardStatus = useCallback(async (status) => {
    if (!current) return;
    setError("");
    const cardKey = String(current.cardId);
    const previous = statusByCard[cardKey];
    setStatusByCard((m) => ({ ...m, [cardKey]: status }));
    try {
      await api.setCardStatus(id, current.cardId, status);
    } catch (err) {
      setError(err.message);
      setStatusByCard((m) => {
        const next = { ...m };
        if (previous === undefined) delete next[cardKey];
        else next[cardKey] = previous;
        return next;
      });
    }
  }, [current, id, statusByCard]);

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
    const disabled = submitting || answered;
    switch (mode) {
      case STUDY_MODES.FLIP:
        return (
          <FlipCard
            current={current}
            sideFirst={sideFirst}
            flipped={flipped}
            suppressAnim={suppressFlipAnim}
            onFlip={flip}
          />
        );
      case STUDY_MODES.MULTIPLE_CHOICE:
        return (
          <MultipleChoice
            current={current}
            selected={selected}
            feedback={feedback}
            onAnswer={submitAnswer}
            disabled={disabled}
          />
        );
      case STUDY_MODES.TRUE_FALSE:
        return (
          <TrueFalse
            current={current}
            selected={selected}
            feedback={feedback}
            onAnswer={submitAnswer}
            disabled={disabled}
          />
        );
      case STUDY_MODES.WRITTEN_ANSWER:
        return (
          <WrittenAnswer
            current={current}
            typedAnswer={typedAnswer}
            setTypedAnswer={setTypedAnswer}
            onAnswer={submitAnswer}
            disabled={disabled}
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

  const progressPct = total > 0 ? ((index + 1) / total) * 100 : 0;

  return (
    <Layout>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          <h2 className={styles.heading}>Study session</h2>
          <div className={styles.pillRow}>
            <span className={styles.pill}>{STUDY_MODE_LABELS[mode]}</span>
            {isFlip && (
              <span className={`${styles.pill} ${styles.muted}`}>
                {sideFirst === CARD_SIDES.FRONT ? "front first" : "back first"}
              </span>
            )}
            {needsReviewOnly && (
              <span className={`${styles.pill} ${styles.muted}`}>needs review only</span>
            )}
          </div>
        </div>
        <Link to={buildPath.deck(id)} className="btn">Back to deck</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {!session && !error && <p>Starting session...</p>}

      {session && current && (
        <section className={`card ${styles.studyCard}`}>
          <div className={styles.progressRow}>
            <span className={styles.progressLabel}>Card {index + 1} of {total}</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {renderQuestion()}

          <FeedbackBanner feedback={feedback} mode={mode} />

          <div className={styles.controlRow}>
            <div className={styles.navGroup}>
              <button type="button" className="btn" onClick={goPrev} disabled={index === 0}>
                {"‹ Previous"}
              </button>
              {isFlip && (
                <button type="button" className="btn btn-primary" onClick={flip}>
                  Flip
                </button>
              )}
              <button type="button" className="btn" onClick={goNext} disabled={index >= total - 1}>
                {"Next ›"}
              </button>
            </div>
            <button
              type="button"
              className={`btn ${styles.shuffleBtn} ${session.shuffleEnabled ? styles.shuffleActive : ""}`}
              onClick={toggleShuffle}
              aria-pressed={session.shuffleEnabled}
            >
              {session.shuffleEnabled ? "Shuffle: On" : "Shuffle: Off"}
            </button>
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Mark this card as</span>
            <div className={styles.statusGroup}>
              {STATUS_BUTTONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`${styles.statusPill} ${STATUS_CLASS[status]} ${currentStatus === status ? styles.statusActive : ""}`}
                  onClick={() => updateCardStatus(status)}
                  aria-pressed={currentStatus === status}
                >
                  {CARD_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {stats && (
        <div className={styles.statsStrip}>
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
            <p className={styles.statValue}>{accuracyPct ?? "—"}</p>
          </div>
        </div>
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
    </Layout>
  );
}
