import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../services/api";

export default function TeacherPage() {
  const [students, setStudents] = useState([]);
  const [decks, setDecks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  async function load() {
    const [studentList, deckList, assignmentList] = await Promise.all([
      api.getStudents(),
      api.getDecks(),
      api.getAssignments()
    ]);
    setStudents(studentList);
    setDecks(deckList.filter((d) => d.access === "owner"));
    setAssignments(assignmentList);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <section className="card">
        <h2>Assign Decks</h2>
        <label>
          Deck
          <select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}>
            <option value="">Choose deck</option>
            {decks.map((deck) => (
              <option key={deck._id} value={deck._id}>{deck.title}</option>
            ))}
          </select>
        </label>
        <p>Students</p>
        {students.map((student) => (
          <label key={student._id} className="checkbox">
            <input
              type="checkbox"
              checked={selectedStudents.includes(student._id)}
              onChange={(e) => {
                setSelectedStudents((prev) => e.target.checked
                  ? [...prev, student._id]
                  : prev.filter((studentId) => studentId !== student._id));
              }}
            />
            {student.username}
          </label>
        ))}
        <button
          type="button"
          onClick={async () => {
            await api.assignDeck({
              deckId: selectedDeck,
              studentIds: selectedStudents
            });
            setSelectedStudents([]);
            await load();
          }}
        >
          Assign
        </button>
      </section>

      <section className="card">
        <h3>Current Assignments</h3>
        {assignments.map((assignment) => (
          <article key={assignment._id} className="deckRow">
            <span>{assignment.deck?.title} -&gt; {assignment.student?.username}</span>
            <button
              type="button"
              onClick={async () => {
                await api.revokeAssignment(assignment._id);
                await load();
              }}
            >
              Revoke
            </button>
          </article>
        ))}
      </section>
    </Layout>
  );
}