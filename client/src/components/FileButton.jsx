import { useId, useRef } from "react";
import styles from "./FileButton.module.css";

export default function FileButton({
  label = "Choose file",
  emptyText = "No file chosen",
  accept,
  name,
  required,
  fileName = "",
  onChange,
  onClear
}) {
  const inputRef = useRef(null);
  const inputId = useId();

  const handleChange = (e) => {
    if (onChange)
      onChange(e);
  };

  const handleClear = () => {
    if (inputRef.current)
      inputRef.current.value = "";
    if (onClear)
      onClear();
  };

  return (
    <span className={styles.wrap}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        name={name}
        required={required}
        className={styles.input}
        onChange={handleChange}
      />
      <span className={styles.name}>{fileName || emptyText}</span>
      {fileName && onClear && (
        <button type="button" className={styles.clear} onClick={handleClear}>
          Clear
        </button>
      )}
    </span>
  );
}
