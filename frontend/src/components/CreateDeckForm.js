import { useState } from "react";
import { createDeck } from "../services/api";

export default function CreateDeckForm({ refresh }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createDeck(name);
    setName("");
    refresh();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Deck Name" />
      <button type="submit">Create Deck</button>
    </form>
  );
}