import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import useConfirm from "../hooks/useConfirm";
import { api } from "../services/api";
import { ACCESS_LEVELS } from "../constants";

export default function TeacherPage() {
  const [students, setStudents] = useState([]);
  const [decks, setDecks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState("");
  const { confirm, modal } = useConfirm();

  const load = useCallback(async () => {
    try {
      const [studentList, deckList, assignmentList] = await Promise.all([
        api.getStudents(),
        api.getDecks(),
        api.getAssignments()
      ]);
      setStudents(studentList);
      setDecks(deckList.filter((d) => d.access === ACCESS_LEVELS.OWNER));
      setAssignments(assignmentList);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = useCallback(async () => {
    setError("");
    try {
      await api.assignDeck({
        deckId: selectedDeck,
        studentIds: selectedStudents
      });
      setSelectedStudents([]);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }, [selectedDeck, selectedStudents, load]);

  const handleRevoke = useCallback(async (assignment) => {
    const ok = await confirm({
      title: "Revoke assignment?",
      message: `${assignment.student?.username || "This student"} will lose access to "${assignment.deck?.title || "this deck"}".`,
      confirmLabel: "Revoke",
      danger: true
    });
    if (!ok) return;
    setError("");
    try {
      await api.revokeAssignment(assignment._id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }, [confirm, load]);

  return (
    <Layout>
      {error && <p className="error">{error}</p>}
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
        <button type="button" onClick={handleAssign}>
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
              className="btn-danger"
              onClick={() => handleRevoke(assignment)}
            >
              Revoke
            </button>
          </article>
        ))}
      </section>
      {modal}
    </Layout>
  );
}