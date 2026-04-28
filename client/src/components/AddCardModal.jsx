import { useEffect, useRef, useState } from "react";
import { api, imageUrl } from "../services/api";
import FileButton from "./FileButton";
import styles from "./AddCardModal.module.css";

const EMPTY_IMAGE = { url: "", name: "", uploading: false };

export default function AddCardModal({ open, deckId, onClose, onAdded }) {
  const dialogRef = useRef(null);
  const frontRef = useRef(null);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState(EMPTY_IMAGE);
  const [backImage, setBackImage] = useState(EMPTY_IMAGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => frontRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset when reopened so a new card starts fresh.
  useEffect(() => {
    if (open) {
      setFront("");
      setBack("");
      setFrontImage(EMPTY_IMAGE);
      setBackImage(EMPTY_IMAGE);
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const handleFilePick = (setter) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setter({ url: "", name: file.name, uploading: true });
    try {
      const url = await api.uploadCardImage(file);
      setter({ url, name: file.name, uploading: false });
    } catch (err) {
      setError(err.message);
      setter(EMPTY_IMAGE);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (frontImage.uploading || backImage.uploading) {
      setError("Please wait for image upload to finish.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.addCard(deckId, {
        front,
        back,
        frontImage: frontImage.url,
        backImage: backImage.url
      });
      if (onAdded) onAdded();
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
      aria-labelledby="add-card-modal-title"
      onCancel={handleCancelEvent}
      onClick={handleBackdropClick}
    >
      <h3 id="add-card-modal-title">Add card</h3>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Front</span>
          <input
            ref={frontRef}
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span>Back</span>
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            required
          />
        </label>

        <div className={styles.imageRow}>
          <div>
            <span className={styles.fieldLabel}>Front image (optional)</span>
            <FileButton
              label="Choose image"
              accept="image/*"
              fileName={frontImage.name}
              onChange={handleFilePick(setFrontImage)}
              onClear={() => setFrontImage(EMPTY_IMAGE)}
            />
            {frontImage.uploading && <p className={styles.uploading}>Uploading...</p>}
            {frontImage.url && !frontImage.uploading && (
              <img src={imageUrl(frontImage.url)} alt="Front preview" className={styles.preview} />
            )}
          </div>
          <div>
            <span className={styles.fieldLabel}>Back image (optional)</span>
            <FileButton
              label="Choose image"
              accept="image/*"
              fileName={backImage.name}
              onChange={handleFilePick(setBackImage)}
              onClear={() => setBackImage(EMPTY_IMAGE)}
            />
            {backImage.uploading && <p className={styles.uploading}>Uploading...</p>}
            {backImage.url && !backImage.uploading && (
              <img src={imageUrl(backImage.url)} alt="Back preview" className={styles.preview} />
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Adding..." : "Add card"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
