import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function DeckList({ onSelectDeck }) {
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    api.getDecks().then(setDecks);
  }, []);

  return (
    <div>
      <h2>All Decks</h2>
      {decks.map(deck => (
        <div key={deck._id} onClick={() => onSelectDeck(deck._id)}>
          {deck.title}
        </div>
      ))}
    </div>
  );
}