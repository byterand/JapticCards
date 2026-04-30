// Centralized string constants shared across the client.
// Keep these in sync with the backend validators (server/validators/*).

// Mirror of server/utils/limits.js, keep the values in sync
export const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 25,
  DECK_TITLE_MAX: 35,
  DECK_DESCRIPTION_MAX: 100,
  DECK_CATEGORY_MAX: 25,
  DECK_TAG_MAX: 15,
  DECK_TAGS_MAX_COUNT: 4,
  CARD_TEXT_MAX: 144,
  CARD_TEXT_MAX_WITH_IMAGE: 72,
  STUDY_ANSWER_MAX: 144
};

export const STUDY_MODES = {
  FLIP: "flip",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  WRITTEN_ANSWER: "written_answer"
};

export const STUDY_MODE_VALUES = Object.values(STUDY_MODES);

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

export const CARD_SIDE_VALUES = Object.values(CARD_SIDES);

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
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  DECK: "/decks/:id",
  STUDY: "/study/:id"
};

export const buildPath = {
  deck: (id) => `/decks/${id}`,
  study: (id) => `/study/${id}`
};

export function formatAccuracyPct(stats) {
  return stats && stats.totalAttempts ? `${Math.round(stats.accuracyRate * 1000) / 10}%` : null;
}
