// Centralized string constants shared across the client.
// Keep these in sync with the backend validators (server/validators/*).

export const STUDY_MODES = {
  FLIP: "flip",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  WRITTEN_ANSWER: "written_answer"
};

export const CARD_SIDES = {
  FRONT: "front",
  BACK: "back"
};

export const CARD_STATUS = {
  KNOWN: "known",
  STILL_LEARNING: "still_learning",
  NEEDS_REVIEW: "needs_review"
};

export const USER_ROLES = {
  STUDENT: "student",
  TEACHER: "teacher"
};

export const ACCESS_LEVELS = {
  OWNER: "owner",
  ASSIGNED: "assigned"
};

export const EXPORT_FORMATS = {
  JSON: "json",
  CSV: "csv"
};

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/",
  TEACHER: "/teacher",
  DECK: "/decks/:id",
  STUDY: "/study/:id"
};

export const buildPath = {
  deck: (id) => `/decks/${id}`,
  study: (id) => `/study/${id}`
};