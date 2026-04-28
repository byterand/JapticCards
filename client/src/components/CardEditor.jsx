import { useCallback, useState } from "react";
import { api, imageUrl } from "../services/api";
import useConfirm from "../hooks/useConfirm";
import EditCardModal from "./EditCardModal";
import { CARD_SIDES } from "../constants";
import styles from "./CardEditor.module.css";

export default function CardEditor({ card, deckId, onSaved, onError }) {
  const { confirm, modal } = useConfirm();
  const [flipped, setFlipped] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const reportError = useCallback((err) => {
    if (onError) {
      onError(err.message);
    }
  }, [onError]);

  const currentSide = flipped ? CARD_SIDES.BACK : CARD_SIDES.FRONT;

  const handleDelete = useCallback(async (e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete card?",
      message: `"${card.front}" will be permanently removed from this deck.`,
      confirmLabel: "Delete",
      danger: true
    });

    if (!ok)
      return;

    try {
      await api.deleteCard(deckId, card._id);
      onSaved();
    } catch (err) {
      reportError(err);
    }
  }, [confirm, deckId, card._id, card.front, onSaved, reportError]);

  const handleEdit = (e) => {
    e.stopPropagation();
    setEditOpen(true);
  };

  return (
    <article className={styles.scene}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={`Edit ${currentSide}`}
          title={`Edit ${currentSide}`}
          onClick={handleEdit}
        >
          ✎
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.danger}`}
          aria-label="Delete card"
          title="Delete card"
          onClick={handleDelete}
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        className={`${styles.card} ${flipped ? styles.flipped : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={`Flashcard showing ${currentSide}. Click to flip.`}
      >
        <div className={`${styles.face} ${styles.front}`}>
          <span className={styles.faceLabel}>Front</span>
          <p className={styles.faceText}>{card.front}</p>
          {card.frontImage && (
            <img src={imageUrl(card.frontImage)} alt="Front visual" className={styles.image} />
          )}
          <span className={styles.flipHint}>Click to flip</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <span className={styles.faceLabel}>Back</span>
          <p className={styles.faceText}>{card.back}</p>
          {card.backImage && (
            <img src={imageUrl(card.backImage)} alt="Back visual" className={styles.image} />
          )}
          <span className={styles.flipHint}>Click to flip</span>
        </div>
      </button>
      <EditCardModal
        open={editOpen}
        card={card}
        side={currentSide}
        deckId={deckId}
        onClose={() => setEditOpen(false)}
        onSaved={onSaved}
      />
      {modal}
    </article>
  );
}
