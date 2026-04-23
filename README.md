# Japtic Cards

Japtic Cards is a full-stack flashcard platform with authentication, role-aware access, deck/card CRUD, study modes, assignment workflows, and progress stats.

## Project Structure

- `frontend/` React app (CRA) for user interface
- `server/` Express + MongoDB API

## Installation

### Backend

1. Install backend dependencies:
   - `cd server`
   - `npm install`
2. Create `server/.env`:
   - `MONGO_URI=<Mongo connection string>`
   - `JWT_SECRET=<random strong secret>`
   - `PORT=5000`
   - `CLIENT_ORIGIN=http://localhost:3000`
3. Start backend:
   - `npm start`

### Frontend

1. Install frontend deps:
   - `cd ../frontend`
   - `npm install`
2. Start frontend:
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