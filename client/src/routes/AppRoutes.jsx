import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ROUTES, USER_ROLES } from "../constants";
import AuthForm from "../pages/AuthForm";
import DashboardPage from "../pages/DashboardPage";
import DeckPage from "../pages/DeckPage";
import LandingPage from "../pages/LandingPage";
import StudyPage from "../pages/StudyPage";
import TeacherPage from "../pages/TeacherPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.LANDING} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<AuthForm key="login" />} />
      <Route path={ROUTES.REGISTER} element={<AuthForm key="register" registerMode />} />
      <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path={ROUTES.DECK} element={<ProtectedRoute><DeckPage /></ProtectedRoute>} />
      <Route path={ROUTES.STUDY} element={<ProtectedRoute><StudyPage /></ProtectedRoute>} />
      <Route
        path={ROUTES.TEACHER}
        element={
          <ProtectedRoute role={USER_ROLES.TEACHER}>
            <TeacherPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
}
