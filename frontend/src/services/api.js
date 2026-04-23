const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const validationMessage = Array.isArray(data?.errors) ? data.errors[0]?.msg : "";
    const message = validationMessage || data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const api = {
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return request("/auth/logout", { method: "POST" });
  },
  me() {
    return request("/auth/me");
  },
  getDecks() {
    return request("/decks");
  },
  createDeck(payload) {
    return request("/decks", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getDeck(id) {
    return request(`/decks/${id}`);
  },
  updateDeck(id, payload) {
    return request(`/decks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteDeck(id) {
    return request(`/decks/${id}`, { method: "DELETE" });
  },
  addCard(deckId, payload) {
    return request(`/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateCard(deckId, cardId, payload) {
    return request(`/decks/${deckId}/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteCard(deckId, cardId) {
    return request(`/decks/${deckId}/cards/${cardId}`, { method: "DELETE" });
  },
  createSession(payload) {
    return request("/study/sessions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  answerSession(sessionId, payload) {
    return request(`/study/sessions/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  toggleShuffle(sessionId, enabled) {
    return request(`/study/sessions/${sessionId}/shuffle`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
  },
  setCardStatus(deckId, cardId, status) {
    return request(`/decks/${deckId}/cards/${cardId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  getStats(deckId) {
    return request(`/decks/${deckId}/stats`);
  },
  getStudents() {
    return request("/teacher/students");
  },
  getAssignments(deckId) {
    const suffix = deckId ? `?deckId=${deckId}` : "";
    return request(`/teacher/assignments${suffix}`);
  },
  assignDeck(payload) {
    return request("/teacher/assignments", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  revokeAssignment(id) {
    return request(`/teacher/assignments/${id}`, { method: "DELETE" });
  },
  exportDeck(id, format) {
    return fetch(`${BASE_URL}/decks/${id}/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    }).then((res) => res.text());
  },
  importDeck(payload) {
    return request("/decks/import", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
