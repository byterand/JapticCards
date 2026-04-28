import { CONTENT_TYPES } from "../constants";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function imageUrl(value) {
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) return `${BASE_URL}${value}`;
  return value;
}

// Access token lives in memory only. Refresh token is delivered via an
// httpOnly cookie and travels with credentials: "include".
let accessToken = null;
let refreshPromise = null;

let onSessionExpired = null;
export function setSessionExpiredHandler(fn) {
  onSessionExpired = typeof fn === "function" ? fn : null;
}

function jsonHeaders() {
  return { "Content-Type": CONTENT_TYPES.JSON };
}

function isJsonResponse(res) {
  return res.headers.get("content-type")?.includes(CONTENT_TYPES.JSON) ?? false;
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders()
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
  // For FormData bodies let the browser set Content-Type (needs the boundary).
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : jsonHeaders()),
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
      // Refresh failed during an authenticated session — let the auth layer
      // know so it can clear local user state and bounce to login.
      onSessionExpired?.();
    }
  }
  return res;
}

function extractErrorMessage(data, fallback = "Request failed") {
  const validationMessage = Array.isArray(data?.errors) ? data.errors[0]?.msg : "";
  return validationMessage || data?.message || data?.error || fallback;
}

async function request(path, options = {}) {
  const res = await doFetch(path, options);
  const data = isJsonResponse(res) ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(extractErrorMessage(data));
  }
  return data;
}

function jsonRequest(path, method, payload) {
  const options = { method };
  if (payload !== undefined) options.body = JSON.stringify(payload);
  return request(path, options);
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
  register(payload) {
    return jsonRequest("/auth/register", "POST", payload);
  },
  async login(payload) {
    const data = await jsonRequest("/auth/login", "POST", payload);
    accessToken = data.token;
    return data;
  },
  async logout() {
    try {
      return await jsonRequest("/auth/logout", "POST");
    } finally {
      accessToken = null;
    }
  },
  me() { return request("/auth/me"); },
  getDecks() { return request("/decks"); },
  createDeck(payload) { return jsonRequest("/decks", "POST", payload); },
  getDeck(id) { return request(`/decks/${id}`); },
  updateDeck(id, payload) { return jsonRequest(`/decks/${id}`, "PATCH", payload); },
  deleteDeck(id) { return jsonRequest(`/decks/${id}`, "DELETE"); },
  addCard(deckId, payload) { return jsonRequest(`/decks/${deckId}/cards`, "POST", payload); },
  updateCard(deckId, cardId, payload) {
    return jsonRequest(`/decks/${deckId}/cards/${cardId}`, "PATCH", payload);
  },
  deleteCard(deckId, cardId) {
    return jsonRequest(`/decks/${deckId}/cards/${cardId}`, "DELETE");
  },
  async uploadCardImage(file) {
    const form = new FormData();
    form.append("image", file);
    const res = await doFetch("/cards/image", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(extractErrorMessage(data, "Upload failed"));
    return data.url;
  },
  // Best-effort: server refuses if the URL is referenced by any Card.
  deleteCardImage(url) {
    return jsonRequest("/cards/image", "DELETE", { url });
  },
  createSession(payload) { return jsonRequest("/study/sessions", "POST", payload); },
  answerSession(sessionId, payload) {
    return jsonRequest(`/study/sessions/${sessionId}/answer`, "POST", payload);
  },
  toggleShuffle(sessionId, enabled) {
    return jsonRequest(`/study/sessions/${sessionId}/shuffle`, "PATCH", { enabled });
  },
  setCardStatus(deckId, cardId, status) {
    return jsonRequest(`/decks/${deckId}/cards/${cardId}/status`, "PATCH", { status });
  },
  getStats(deckId) { return request(`/decks/${deckId}/stats`); },
  async exportDeck(id, format) {
    const res = await doFetch(`/decks/${id}/export?format=${format}`, { method: "GET" });
    if (!res.ok) {
      // Without this check, a JSON error body (e.g. 401/404) would be written into the downloaded .csv/.json file.
      let message = "Export failed";
      if (isJsonResponse(res)) {
        try {
          message = extractErrorMessage(await res.json(), message);
        } catch {
          // keep default message
        }
      }
      throw new Error(message);
    }
    return res.text();
  },
  importDeck(payload) { return jsonRequest("/decks/import", "POST", payload); }
};
