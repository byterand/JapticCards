import { useEffect, useState } from "react";
import { getDeck } from "../services/api";
import Flashcard from "./Flashcard";

export default function DeckView({ deckId }) {
  const [deck, setDeck] = useState(null);

  useEffect(() => {
    if (deckId) {
      getDeck(deckId).then(setDeck);
    }
  }, [deckId]);

  if (!deck) return <p>Select a deck</p>;

  return (
    <div>
      <h2>{deck.deckName}</h2>
      {deck.cards.map(card => (
        <Flashcard key={card._id} card={card} />
      ))}
    </div>
  );
}