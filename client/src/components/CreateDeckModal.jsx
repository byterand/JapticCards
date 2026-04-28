import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { buildPath } from "../constants";
import styles from "./CreateDeckModal.module.css";

export default function CreateDeckModal({ open, onClose, onCreated }) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => titleRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset form whenever the modal opens fresh
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setCategory("");
      setTags("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onClose();
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const created = await api.createDeck({
        title,
        description,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
      });
      if (onCreated) onCreated(created);
      onClose();
      // Land on the new deck page so the user can immediately add cards.
      if (created?._id) navigate(buildPath.deck(created._id));
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
      aria-labelledby="create-deck-modal-title"
      onCancel={handleCancelEvent}
    >
      <h3 id="create-deck-modal-title">New deck</h3>
      <p>You'll be taken to the deck page once its created.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className={styles.field}>
          <span>Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Languages"
          />
        </label>
        <label className={styles.field}>
          <span>Tags (comma-separated)</span>
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
            {submitting ? "Creating..." : "Create deck"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
