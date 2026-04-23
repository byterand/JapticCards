import { useEffect, useRef } from "react";

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
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title">{title}</h3>
        {message && <p>{message}</p>}
        <div className="modal-actions">
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
      </div>
    </div>
  );
}
