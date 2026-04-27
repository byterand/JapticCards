import { useCallback, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

/**
 * Usage:
 *   const { confirm, modal } = useConfirm();
 *   ...
 *   const ok = await confirm({
 *     title: "Delete deck?",
 *     message: `"${deck.title}" will be permanently removed.`,
 *     confirmLabel: "Delete",
 *     danger: true
 *   });
 *   if (!ok) return;
 *   await api.deleteDeck(deck._id);
 *
 *   // Render anywhere in the component tree:
 *   return <>{modal}{/* ... *\/}</>;
 */
export default function useConfirm() {
  const [pending, setPending] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (result) => {
    if (pending) pending.resolve(result);
    setPending(null);
  };

  const modal = (
    <ConfirmModal
      open={pending !== null}
      title={pending?.title}
      message={pending?.message}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      danger={pending?.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, modal };
}
