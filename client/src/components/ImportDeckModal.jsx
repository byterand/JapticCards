import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { EXPORT_FORMATS } from "../constants";
import FileButton from "./FileButton";
import styles from "./ImportDeckModal.module.css";

export default function ImportDeckModal({ open, onClose, onImported }) {
  const dialogRef = useRef(null);
  const [format, setFormat] = useState(EXPORT_FORMATS.JSON);
  const [file, setFile] = useState(null);
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
      setFile(null);
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
    if (!file) {
      setError("Please choose a file to import.");
      return;
    }
    setError("");
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
    >
      <h3 id="import-deck-modal-title">Import deck</h3>
      <p>Pick the format and upload an exported deck file.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value={EXPORT_FORMATS.JSON}>JSON</option>
            <option value={EXPORT_FORMATS.CSV}>CSV</option>
          </select>
        </label>
        <div className={styles.field}>
          <span>File</span>
          <FileButton
            label="Choose file"
            accept={format === EXPORT_FORMATS.CSV ? ".csv,text/csv" : ".json,application/json"}
            fileName={file?.name || ""}
            onChange={(e) => setFile(e.target.files[0] || null)}
            onClear={() => setFile(null)}
          />
        </div>
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
