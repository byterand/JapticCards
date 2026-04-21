# Japtic Cards

Japtic Cards is a full-stack flashcard platform with authentication, role-aware access, deck/card CRUD, study modes, assignment workflows, and progress stats.

## Project Structure

- `frontend/` React app (CRA) for user interface
- `server/` Express + MongoDB API

## Quick Start

1. Install backend deps:
   - `cd server`
   - `npm install`
2. Create `server/.env`:
   - `MONGO_URI=<your Mongo connection string>`
   - `JWT_SECRET=<random strong secret>`
   - `PORT=5000`
   - `CLIENT_ORIGIN=http://localhost:3000`
3. Start backend:
   - `npm start`
4. Install frontend deps:
   - `cd ../frontend`
   - `npm install`
5. Start frontend:
   - `npm start`

Frontend expects API at `http://localhost:5000` by default. Override with `REACT_APP_API_URL`.

## Testing

- Backend:
  - `cd server`
  - `npm test`
- Frontend:
  - `cd frontend`
  - `npm test -- --watchAll=false`
  - `npm run build`

## Story Coverage Matrix

- US1 Register: implemented
- US2 Login/Logout/Protected routes: implemented
- US3 Role support: implemented
- US4 Deck CRUD: implemented
- US5 Card CRUD: implemented
- US6 Study session (flip, nav, side-first): implemented
- US7 Study modes MC/TF/Written: implemented
- US8 Card status + needs-review filter: implemented
- US9 Session shuffle toggle + restore: implemented
- US10 Teacher assignments + revoke + student read-only: implemented
- US11 Card image upload + persistence: implemented (base64 in Mongo)
- US12 Deck search/filter/no-results/reset: implemented
- US13 Consistent look + persistent nav: implemented
- US14 Per-deck/per-card study stats: implemented
- US15 Import/export JSON+CSV: implemented
