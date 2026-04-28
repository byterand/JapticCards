import { useEffect, useRef } from "react";
import { EXPORT_FORMATS } from "../constants";
import styles from "./ExportMenu.module.css";

export default function ExportMenu({
  onExport,
  label = "Export",
  ariaLabel,
  compact = false,
  disabled = false
}) {
  const detailsRef = useRef(null);

  // Close the popover on outside-click so it behaves like a normal menu.
  useEffect(() => {
    const handler = (e) => {
      const el = detailsRef.current;
      if (!el || !el.open)
        return;

      if (!el.contains(e.target))
        el.open = false;
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const pick = (format) => {
    if (detailsRef.current)
      detailsRef.current.open = false;
    onExport(format);
  };

  return (
    <details ref={detailsRef} className={`${styles.menu} ${compact ? styles.compact : ""}`}>
      <summary aria-label={ariaLabel || (typeof label === "string" ? label : undefined)} title={ariaLabel}>
        {label}
      </summary>
      <div className={styles.popover} role="menu">
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          onClick={() => pick(EXPORT_FORMATS.JSON)}
          disabled={disabled}
        >
          Export as JSON
        </button>
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          onClick={() => pick(EXPORT_FORMATS.CSV)}
          disabled={disabled}
        >
          Export as CSV
        </button>
      </div>
    </details>
  );
}