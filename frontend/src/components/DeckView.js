import { useEffect, useState } from "react";
import { api } from "../services/api";
import Flashcard from "./Flashcard";

export default function DeckView({ deckId }) {
  const [deck, setDeck] = useState(null);

  useEffect(() => {
    if (deckId) {
      api.getDeck(deckId).then(setDeck);
    }
  }, [deckId]);

  if (!deck) return <p>Select a deck</p>;

  return (
    <div>
      <h2>{deck.title}</h2>
      {deck.cards.map(card => (
        <Flashcard key={card._id} card={card} />
      ))}
    </div>
  );
}