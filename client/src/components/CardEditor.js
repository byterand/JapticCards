import { useEffect, useState } from "react";
import { api, imageUrl } from "../services/api";
import useConfirm from "../hooks/useConfirm";

export default function CardEditor({ card, deckId, readOnly, onSaved, onError }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const { confirm, modal } = useConfirm();

  const reportError = (err) => {
    if (onError) onError(err.message);
  };

  // Sync inputs when the card prop changes
  useEffect(() => {
    setFront(card.front);
    setBack(card.back);
  }, [card._id, card.front, card.back]);

  const handleSave = async () => {
    try {
      await api.updateCard(deckId, card._id, { front, back });
      onSaved();
    } catch (err) {
      reportError(err);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete card?",
      message: `"${card.front}" will be permanently removed from this deck.`,
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    try {
      await api.deleteCard(deckId, card._id);
      onSaved();
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <article className="cardRow">
      <div>
        <strong>{card.front}</strong> -&gt; {card.back}
        {card.frontImage && (
          <img src={imageUrl(card.frontImage)} alt="Front visual" className="thumb" />
        )}
        {card.backImage && (
          <img src={imageUrl(card.backImage)} alt="Back visual" className="thumb" />
        )}
      </div>
      {!readOnly && (
        <div className="actions">
          <input value={front} onChange={(e) => setFront(e.target.value)} />
          <input value={back} onChange={(e) => setBack(e.target.value)} />
          <button type="button" onClick={handleSave}>
            Save
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
      {modal}
    </article>
  );
}