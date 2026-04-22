import { useState } from "react";
import { addCard } from "../services/api";

export default function AddCardForm({ deckId, refresh }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addCard(deckId, front, back);
    setFront("");
    setBack("");
    refresh();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={front} onChange={e => setFront(e.target.value)} placeholder="Front" />
      <input value={back} onChange={e => setBack(e.target.value)} placeholder="Back" />
      <button type="submit">Add Card</button>
    </form>
  );
}