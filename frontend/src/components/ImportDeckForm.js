import { useState } from "react";
import { api } from "../services/api";

export default function ImportDeckForm({ onImported }) {
  const [format, setFormat] = useState("json");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const file = e.target.file.files[0];
        if (!file) return;
        const content = await file.text();
        try {
          await api.importDeck({ format, content });
          e.target.reset();
          onImported();
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      {error && <p className="error">{error}</p>}
      <label>
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </label>
      <input type="file" name="file" required />
      <button type="submit">Import</button>
    </form>
  );
}