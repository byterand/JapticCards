import { useState } from "react";

export default function Flashcard({ card }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      style={{ border: "1px solid black", padding: "20px", margin: "10px" }}
    >
      {flipped ? card.back : card.front}
    </div>
  );
}