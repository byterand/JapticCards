import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { LIMITS } from "../constants";
import styles from "./EditDeckModal.module.css";

export default function EditDeckModal({ open, deck, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog)
      return;

    if (open) {
      if (!dialog.open)
        dialog.showModal();
      queueMicrotask(() => titleRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Seed inputs from the deck whenever the modal opens.
  useEffect(() => {
    if (open && deck) {
      setTitle(deck.title || "");
      setDescription(deck.description || "");
      setCategory(deck.category || "");
      setTags(Array.isArray(deck.tags) ? deck.tags.join(", ") : "");
      setError("");
      setSubmitting(false);
    }
  }, [open, deck]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !deck)
      return;

    setError("");
    setSubmitting(true);

    try {
      await api.updateDeck(deck._id, {
        title,
        description,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
      });

      if (onSaved)
        onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="edit-deck-modal-title"
      onCancel={handleCancelEvent}
    >
      <h3 id="edit-deck-modal-title">Edit deck</h3>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={LIMITS.DECK_TITLE_MAX}
          />
        </label>
        <label className={styles.field}>
          <span>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.DECK_DESCRIPTION_MAX}
          />
        </label>
        <label className={styles.field}>
          <span>Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={LIMITS.DECK_CATEGORY_MAX}
          />
        </label>
        <label className={styles.field}>
          <span>Tags (comma-separated, up to {LIMITS.DECK_TAGS_MAX_COUNT})</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="travel, beginner"
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save deck"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
