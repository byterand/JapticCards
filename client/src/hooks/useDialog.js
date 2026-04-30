import { useEffect } from "react";

// Centralizes the show/close dance for the native <dialog> element used by all
// modals. Pass a ref to the dialog and (optionally) a ref to the element that
// should receive focus when the dialog opens.
export default function useDialog(open, dialogRef, focusRef) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog)
      return;

    if (open) {
      if (!dialog.open)
        dialog.showModal();
      if (focusRef)
        queueMicrotask(() => focusRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, dialogRef, focusRef]);
}
