import { useState } from "react";
import { api, imageUrl } from "../services/api";

export default function CardEditor({ card, deckId, readOnly, onSaved }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

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
          <button
            type="button"
            onClick={async () => {
              await api.updateCard(deckId, card._id, { front, back });
              onSaved();
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={async () => {
              await api.deleteCard(deckId, card._id);
              onSaved();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}