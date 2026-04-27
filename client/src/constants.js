// Centralized string constants shared across the client.
// Keep these in sync with the backend validators (server/validators/*).

export const STUDY_MODES = {
  FLIP: "flip",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  WRITTEN_ANSWER: "written_answer"
};

export const STUDY_MODE_LABELS = {
  [STUDY_MODES.FLIP]: "Flip",
  [STUDY_MODES.MULTIPLE_CHOICE]: "Multiple Choice",
  [STUDY_MODES.TRUE_FALSE]: "True/False",
  [STUDY_MODES.WRITTEN_ANSWER]: "Written Answer"
};

export const CARD_SIDES = {
  FRONT: "front",
  BACK: "back"
};

export const CARD_SIDE_LABELS = {
  [CARD_SIDES.FRONT]: "Front",
  [CARD_SIDES.BACK]: "Back"
};

export const CARD_STATUS = {
  KNOWN: "known",
  STILL_LEARNING: "still_learning",
  NEEDS_REVIEW: "needs_review"
};

export const CARD_STATUS_LABELS = {
  [CARD_STATUS.KNOWN]: "Known",
  [CARD_STATUS.STILL_LEARNING]: "Still Learning",
  [CARD_STATUS.NEEDS_REVIEW]: "Needs Review"
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

export const CONTENT_TYPES = {
  JSON: "application/json",
  CSV: "text/csv"
};

export const CONTENT_TYPE_BY_FORMAT = {
  [EXPORT_FORMATS.JSON]: CONTENT_TYPES.JSON,
  [EXPORT_FORMATS.CSV]: CONTENT_TYPES.CSV
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
