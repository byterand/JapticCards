import { useEffect, useRef } from "react";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel
}) {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => confirmBtnRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCancelEvent = (e) => {
    e.preventDefault();
    onCancel();
  };


  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="confirm-modal-title"
      onCancel={handleCancelEvent}
    >
      <h3 id="confirm-modal-title">{title}</h3>
      {message && <p>{message}</p>}
      <div className={styles.modalActions}>
        <button type="button" onClick={onCancel}>{cancelLabel}</button>
        <button
          ref={confirmBtnRef}
          type="button"
          className={danger ? "btn-danger" : ""}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
