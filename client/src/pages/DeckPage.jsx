import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import CardEditor from "../components/CardEditor";
import { api } from "../services/api";

export default function DeckPage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState("");
  const [backImage, setBackImage] = useState("");
  const [error, setError] = useState("");

  const loadDeck = useCallback(async () => {
    try {
      const data = await api.getDeck(id);
      setDeck(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setCategory(data.category || "");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  const uploadImage = useCallback(async (file) => {
    try {
      return await api.uploadCardImage(file);
    } catch (err) {
      setError(err.message);
      return "";
    }
  }, []);

  // Returns an onChange handler that uploads the selected file and stores the
  // resulting URL via the given setter. Removes the duplicated front/back
  // handler bodies in the Add Card form.
  const handleImageUpload = useCallback((setter) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setter(await uploadImage(file));
  }, [uploadImage]);

  if (!deck) {
    return (
      <Layout>
        {error ? <p className="error">{error}</p> : <p>Loading deck...</p>}
      </Layout>
    );
  }

  return (
    <Layout>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>{deck.title}</h2>
        <p>{deck.description}</p>
        <p><strong>Category:</strong> {deck.category || "None"}</p>
        {!deck.readOnly && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                await api.updateDeck(deck._id, { title, description, category });
                await loadDeck();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <h3>Edit Deck</h3>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Category
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <button type="submit">Save Deck</button>
          </form>
        )}
      </section>

      {!deck.readOnly && (
        <section className="card">
          <h3>Add Card</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                await api.addCard(deck._id, { front, back, frontImage, backImage });
                setFront("");
                setBack("");
                setFrontImage("");
                setBackImage("");
                e.target.reset();
                await loadDeck();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <label>
              Front
              <input value={front} onChange={(e) => setFront(e.target.value)} required />
            </label>
            <label>
              Back
              <input value={back} onChange={(e) => setBack(e.target.value)} required />
            </label>
            <label>
              Front Image
              <input type="file" accept="image/*" onChange={handleImageUpload(setFrontImage)} />
            </label>
            <label>
              Back Image
              <input type="file" accept="image/*" onChange={handleImageUpload(setBackImage)} />
            </label>
            <button type="submit">Add Card</button>
          </form>
        </section>
      )}

      <section className="card">
        <h3>Cards</h3>
        {deck.cards?.map((card) => (
          <CardEditor
            key={card._id}
            card={card}
            deckId={deck._id}
            readOnly={deck.readOnly}
            onSaved={loadDeck}
            onError={setError}
          />
        ))}
      </section>
    </Layout>
  );
}
