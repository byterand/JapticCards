const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Access token lives in memory only. Refresh token is delivered via an httpOnly cookie and travels with credentials: "include".
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) {
      accessToken = null;
      throw new Error("Session expired");
    }
    const data = await res.json();
    accessToken = data.token;
    return data;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doFetch(path, options, { retry = true } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  // Attempt exactly one silent refresh + retry on 401
  const isAuthRoute = path.startsWith("/auth/");
  if (res.status === 401 && retry && !isAuthRoute && accessToken) {
    try {
      await refreshAccessToken();
      return doFetch(path, options, { retry: false });
    } catch {
      // fall through to error handling below
    }
  }
  return res;
}

async function request(path, options = {}) {
  const res = await doFetch(path, options);
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
  async restoreSession() {
    try {
      const data = await refreshAccessToken();
      return data.user;
    } catch {
      return null;
    }
  },
  async register(payload) {
    return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  },
  async login(payload) {
    const data = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    accessToken = data.token;
    return data;
  },
  async logout() {
    try {
      return await request("/auth/logout", { method: "POST" });
    } finally {
      accessToken = null;
    }
  },
  me() { return request("/auth/me"); },
  getDecks() { return request("/decks"); },
  createDeck(payload) { return request("/decks", { method: "POST", body: JSON.stringify(payload) }); },
  getDeck(id) { return request(`/decks/${id}`); },
  updateDeck(id, payload) { return request(`/decks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  deleteDeck(id) { return request(`/decks/${id}`, { method: "DELETE" }); },
  addCard(deckId, payload) { return request(`/decks/${deckId}/cards`, { method: "POST", body: JSON.stringify(payload) }); },
  updateCard(deckId, cardId, payload) { return request(`/decks/${deckId}/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  deleteCard(deckId, cardId) { return request(`/decks/${deckId}/cards/${cardId}`, { method: "DELETE" }); },
  createSession(payload) { return request("/study/sessions", { method: "POST", body: JSON.stringify(payload) }); },
  answerSession(sessionId, payload) { return request(`/study/sessions/${sessionId}/answer`, { method: "POST", body: JSON.stringify(payload) }); },
  toggleShuffle(sessionId, enabled) { return request(`/study/sessions/${sessionId}/shuffle`, { method: "PATCH", body: JSON.stringify({ enabled }) }); },
  setCardStatus(deckId, cardId, status) { return request(`/decks/${deckId}/cards/${cardId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); },
  getStats(deckId) { return request(`/decks/${deckId}/stats`); },
  getStudents() { return request("/teacher/students"); },
  getAssignments(deckId) {
    const suffix = deckId ? `?deckId=${deckId}` : "";
    return request(`/teacher/assignments${suffix}`);
  },
  assignDeck(payload) { return request("/teacher/assignments", { method: "POST", body: JSON.stringify(payload) }); },
  revokeAssignment(id) { return request(`/teacher/assignments/${id}`, { method: "DELETE" }); },
  async exportDeck(id, format) {
    const res = await doFetch(`/decks/${id}/export?format=${format}`, { method: "GET" });
    return res.text();
  },
  importDeck(payload) { return request("/decks/import", { method: "POST", body: JSON.stringify(payload) }); }
};
