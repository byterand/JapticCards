# Japtic Cards

#### Payton Bates, Jacob Radzieta, Irakli Dokhnadze, Tate Barnard, Chris Field, Aarya Radhan.

---

A full-stack flashcard platform. Each user builds and studies their own decks, and decks can be shared between accounts via JSON or CSV export/import. Per-card progress is tracked across multiple study modes.

The repo is an npm workspace: a single `npm install` at the root installs the server and client, and a single `npm run dev` starts both.

---

## Overview

The app is split into a Node/Express API backed by MongoDB and a React client built with Vite. Authentication uses short-lived JWT access tokens carried in the `Authorization` header plus a long-lived refresh token delivered as an httpOnly cookie that's rotated on every refresh. Every account is equal: any user can create decks, and a deck is fully owned by its creator. Sharing a deck with another user is done by exporting it (JSON or CSV) and importing it into the other account.

A "deck" is a titled, optionally categorized/tagged collection of cards, where each card has a front and a back plus optional images. A "study session" is a snapshot of a deck (or its needs-review subset) frozen into a question list at creation time so grading is deterministic and tamper-resistant on the server. Four study modes are supported: classic card flip, multiple choice, true/false, and written answer.

---

## Setup

```bash
git clone https://github.com/byterand/JapticCards
cd JapticCards
npm install
```

Create `server/.env` with at minimum:

```
MONGO_URI=mongodb://127.0.0.1:27017/japticcards
JWT_SECRET=<at least 16 characters>
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
```

(Optional) override the client's API base URL by adding `client/.env`:

```
VITE_API_URL=http://localhost:5000
```

Make sure MongoDB is running locally. Atlas works too if you point `MONGO_URI` at it. Ensure that it has a replica set.

## Running

You can run the app in multiple ways.

### Concurrently

From the repo root:

```bash
npm run dev
```

This starts both the server and the Vite dev server in the same terminal, with prefixed `[server]` / `[client]` output color-coded blue and green. Vite opens `http://localhost:3000` automatically; the server listens on `http://localhost:5000`.

### Each side separately, from the root

In two terminals:

```bash
npm run dev:server
npm run dev:client
```

### Each side separately, from the package folder

To run them from their respective folders:

```bash
cd server && npm start
cd client && npm run dev
```

---

## Testing

Together:

```bash
npm test
```

Or individually:

```bash
cd server && npm test
cd client && npm test
```

The server tests start up an in-memory MongoDB via `mongodb-memory-server` so no external database is needed.

---

## Features

### Implemented

**Authentication & accounts**
- Register / login / logout with bcrypt-hashed passwords.
- JWT access tokens (15 min TTL, `Authorization: Bearer …`).
- Refresh tokens (7 day TTL) delivered as httpOnly, SameSite=strict cookies on the `/auth` path; rotated atomically on every refresh.

**Access control**
- Decks are owner-only: the creator gets full read/write; everyone else gets a 404.
- Cross-account sharing is done by exporting the deck and re-importing it into another account.

**Decks**
- CRUD with title, description, category, and tags.
- Search and category filter on the dashboard.
- JSON and CSV import/export — the primary mechanism for sharing decks between accounts.
- Cascade on deletion (cards, per-user progress, study sessions).

**Cards**
- CRUD with front/back text and optional front/back images.
- Image uploads via `multipart/form-data` to `POST /cards/image` (PNG/JPEG/WebP/GIF, ≤5 MB, hashed filenames stored under `server/uploads/cards/`).
- Per-user card status: `known`, `still_learning`, `needs_review`.
- Per-card correct/incorrect counters.

**Study sessions**
- Modes: `flip`, `multiple_choice`, `true_false`, `written_answer`.
- Configurable starting side (`front` or `back`) for flip mode.
- "Needs review only" filter to drill on cards the user has flagged.
- Server persists each question's options/correct answer at session creation, so grading is server-authoritative.
- Shuffle toggle that reorders the active card list without losing the original order.

**Statistics**
- Per-deck summary: cards studied, total correct/incorrect, accuracy rate.
- Per-card breakdown: correct/incorrect counts and current status.