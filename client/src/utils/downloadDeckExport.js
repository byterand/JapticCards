import { api } from "../services/api";
import { CONTENT_TYPE_BY_FORMAT, CONTENT_TYPES } from "../constants";

export async function downloadDeckExport(deck, format) {
  const content = await api.exportDeck(deck._id, format);
  const blobType = CONTENT_TYPE_BY_FORMAT[format] || CONTENT_TYPES.JSON;
  const blob = new Blob([content], { type: blobType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${deck.title || "deck"}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
