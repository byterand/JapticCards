import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { EXPORT_FORMATS } from "../constants";
import styles from "./ImportDeckModal.module.css";

export default function ImportDeckModal({ open, onClose, onImported }) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const [format, setFormat] = useState(EXPORT_FORMATS.JSON);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setFormat(EXPORT_FORMATS.JSON);
      setError("");
      setSubmitting(false);
      formRef.current?.reset();
    }
  }, [open]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    const file = e.target.file.files[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const content = await file.text();
      await api.importDeck({ format, content });
      if (onImported) onImported();
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
      aria-labelledby="import-deck-modal-title"
      onCancel={handleCancelEvent}
      onClick={handleBackdropClick}
    >
      <h3 id="import-deck-modal-title">Import deck</h3>
      <p>Pick the format and upload an exported deck file.</p>
      {error && <p className="error">{error}</p>}
      <form ref={formRef} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value={EXPORT_FORMATS.JSON}>JSON</option>
            <option value={EXPORT_FORMATS.CSV}>CSV</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>File</span>
          <input type="file" name="file" required />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Importing..." : "Import"}
          </button>
        </div>
      </form>
    </dialog>
  );
}