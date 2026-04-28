import { Link } from "react-router-dom";
import ExportMenu from "./ExportMenu";
import { buildPath } from "../constants";
import styles from "./DeckRow.module.css";

function formatRelative(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))}w ago`;
  return new Date(value).toLocaleDateString();
}

export default function DeckRow({
  deck,
  variant = "full",
  onExport,
  onDelete
}) {
  const isMini = variant === "mini";
  const cardCount = Array.isArray(deck.cards) ? deck.cards.length : deck.cardCount;

  const metaParts = [];
  if (typeof cardCount === "number") metaParts.push(`${cardCount} card${cardCount === 1 ? "" : "s"}`);
  if (deck.readOnly) metaParts.push("read-only");
  if (isMini) {
    const updated = formatRelative(deck.updatedAt);
    if (updated) metaParts.push(`updated ${updated}`);
  }

  return (
    <article className={`${styles.row} ${isMini ? styles.mini : ""}`}>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <Link to={buildPath.deck(deck._id)} className={styles.title}>
            {deck.title}
          </Link>
          {deck.category && <span className={styles.pill}>{deck.category}</span>}
          {deck.readOnly && <span className={`${styles.pill} ${styles.muted}`}>Assigned</span>}
        </div>
        {!isMini && deck.description && (
          <p className={styles.description}>{deck.description}</p>
        )}
        {metaParts.length > 0 && <p className={styles.meta}>{metaParts.join(" · ")}</p>}
      </div>
      <div className={styles.actions}>
        {!isMini && (
          <Link to={buildPath.deck(deck._id)} className="btn">Open</Link>
        )}
        <Link to={buildPath.study(deck._id)} className="btn btn-primary">Study</Link>
        {!isMini && onExport && (
          <ExportMenu
            compact
            label="⤓"
            ariaLabel="Export deck"
            onExport={(format) => onExport(deck, format)}
          />
        )}
        {!isMini && !deck.readOnly && onDelete && (
          <button
            type="button"
            className={`btn-danger ${styles.iconBtn}`}
            aria-label="Delete deck"
            title="Delete deck"
            onClick={() => onDelete(deck)}
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}
