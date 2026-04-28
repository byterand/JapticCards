import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

export default function useConfirm() {
  const [pending, setPending] = useState(null);

  const pendingRef = useRef(null);
  pendingRef.current = pending;

  useEffect(() => () => {
    pendingRef.current?.resolve(false);
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (result) => {
    if (pending)
      pending.resolve(result);
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
