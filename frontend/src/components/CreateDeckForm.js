import { useState } from "react";
import { api } from "../services/api";

export default function CreateDeckForm({ refresh }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.createDeck({ title: name });
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