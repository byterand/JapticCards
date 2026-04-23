import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { USER_ROLES } from "../constants";
import AuthForm from "../pages/AuthForm";
import DashboardPage from "../pages/DashboardPage";
import DeckPage from "../pages/DeckPage";
import StudyPage from "../pages/StudyPage";
import TeacherPage from "../pages/TeacherPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm />} />
      <Route path="/register" element={<AuthForm registerMode />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/decks/:id" element={<ProtectedRoute><DeckPage /></ProtectedRoute>} />
      <Route path="/study/:id" element={<ProtectedRoute><StudyPage /></ProtectedRoute>} />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute role={USER_ROLES.TEACHER}>
            <TeacherPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}