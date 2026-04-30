import { useEffect, useRef, useState } from "react";
import { api, imageUrl } from "../services/api";
import FileButton from "./FileButton";
import { LIMITS } from "../constants";
import styles from "./AddCardModal.module.css";

const EMPTY_IMAGE = { url: "", name: "", uploading: false };

function discardUpload(url) {
  if (!url) return;
  api.deleteCardImage(url).catch(() => {});
}

export default function AddCardModal({ open, deckId, onClose, onAdded }) {
  const dialogRef = useRef(null);
  const frontRef = useRef(null);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState(EMPTY_IMAGE);
  const [backImage, setBackImage] = useState(EMPTY_IMAGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pendingUploadsRef = useRef(new Set());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog)
      return;

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
      pendingUploadsRef.current = new Set();
    }
  }, [open]);

  const cancelClose = () => {
    pendingUploadsRef.current.forEach(discardUpload);
    pendingUploadsRef.current.clear();
    onClose();
  };

  const handleCancelEvent = (e) => {
    e.preventDefault();
    cancelClose();
  };

  const handleFilePick = (setter, currentUrl) => async (e) => {
    const file = e.target.files[0];
    if (!file)
      return;

    if (currentUrl) {
      pendingUploadsRef.current.delete(currentUrl);
      discardUpload(currentUrl);
    }

    setter({ url: "", name: file.name, uploading: true });

    try {
      const url = await api.uploadCardImage(file);
      pendingUploadsRef.current.add(url);
      setter({ url, name: file.name, uploading: false });
    } catch (err) {
      setError(err.message);
      setter(EMPTY_IMAGE);
    }
  };

  const handleClear = (setter, currentUrl) => () => {
    if (currentUrl) {
      pendingUploadsRef.current.delete(currentUrl);
      discardUpload(currentUrl);
    }
    setter(EMPTY_IMAGE);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting)
      return;

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

      pendingUploadsRef.current.delete(frontImage.url);
      pendingUploadsRef.current.delete(backImage.url);
      pendingUploadsRef.current.forEach(discardUpload);
      pendingUploadsRef.current.clear();

      if (onAdded)
        onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const frontMax = (frontImage.url || frontImage.name) ? LIMITS.CARD_TEXT_MAX_WITH_IMAGE : LIMITS.CARD_TEXT_MAX;
  const backMax = (backImage.url || backImage.name) ? LIMITS.CARD_TEXT_MAX_WITH_IMAGE : LIMITS.CARD_TEXT_MAX;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="add-card-modal-title"
      onCancel={handleCancelEvent}
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
            maxLength={frontMax}
          />
        </label>
        <label className={styles.field}>
          <span>Back</span>
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            required
            maxLength={backMax}
          />
        </label>

        <div className={styles.imageRow}>
          <div>
            <span className={styles.fieldLabel}>Front image (optional)</span>
            <FileButton
              label="Choose image"
              accept="image/*"
              fileName={frontImage.name}
              onChange={handleFilePick(setFrontImage, frontImage.url)}
              onClear={handleClear(setFrontImage, frontImage.url)}
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
              onChange={handleFilePick(setBackImage, backImage.url)}
              onClear={handleClear(setBackImage, backImage.url)}
            />
            {backImage.uploading && <p className={styles.uploading}>Uploading...</p>}
            {backImage.url && !backImage.uploading && (
              <img src={imageUrl(backImage.url)} alt="Back preview" className={styles.preview} />
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={cancelClose} disabled={submitting}>
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
