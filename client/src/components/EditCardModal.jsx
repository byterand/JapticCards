import { useEffect, useRef, useState } from "react";
import { api, imageUrl } from "../services/api";
import FileButton from "./FileButton";
import { CARD_SIDES } from "../constants";
import styles from "./EditCardModal.module.css";

const EMPTY_IMAGE = { url: "", name: "", uploading: false };

function deriveNameFromUrl(url) {
  if (!url) return "";
  // Best-effort filename for display when seeded from an existing image URL.
  const last = url.split(/[\\/]/).pop() || "";
  return last.split("?")[0];
}

export default function EditCardModal({
  open,
  card,
  side = CARD_SIDES.FRONT,
  deckId,
  onClose,
  onSaved
}) {
  const dialogRef = useRef(null);
  const textRef = useRef(null);

  const isFront = side === CARD_SIDES.FRONT;
  const sideLabel = isFront ? "Front" : "Back";

  const [text, setText] = useState("");
  const [image, setImage] = useState(EMPTY_IMAGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => textRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Seed from the requested side whenever we open or the side changes.
  useEffect(() => {
    if (open && card) {
      const seedText = isFront ? card.front : card.back;
      const seedImage = isFront ? card.frontImage : card.backImage;
      setText(seedText || "");
      setImage({ url: seedImage || "", name: deriveNameFromUrl(seedImage), uploading: false });
      setError("");
      setSubmitting(false);
    }
  }, [open, card, isFront]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const handleFilePick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage({ url: "", name: file.name, uploading: true });
    try {
      const url = await api.uploadCardImage(file);
      setImage({ url, name: file.name, uploading: false });
    } catch (err) {
      setError(err.message);
      setImage(EMPTY_IMAGE);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !card) return;
    if (image.uploading) {
      setError("Please wait for image upload to finish.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = isFront
        ? { front: text, frontImage: image.url }
        : { back: text, backImage: image.url };
      await api.updateCard(deckId, card._id, payload);
      if (onSaved) onSaved();
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
      aria-labelledby="edit-card-modal-title"
      onCancel={handleCancelEvent}
      onClick={handleBackdropClick}
    >
      <h3 id="edit-card-modal-title">Edit {sideLabel.toLowerCase()}</h3>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>{sideLabel} text</span>
          <input
            ref={textRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>

        <div className={styles.imageField}>
          <span className={styles.fieldLabel}>{sideLabel} image (optional)</span>
          <FileButton
            label={image.url ? "Replace" : "Choose image"}
            accept="image/*"
            fileName={image.name}
            onChange={handleFilePick}
            onClear={() => setImage(EMPTY_IMAGE)}
          />
          {image.uploading && <p className={styles.uploading}>Uploading...</p>}
          {image.url && !image.uploading && (
            <img src={imageUrl(image.url)} alt={`${sideLabel} preview`} className={styles.preview} />
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : `Save ${sideLabel.toLowerCase()}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
