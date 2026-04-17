import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./Home";
import AdminDashboard from "./pages/AdminDashboard";
import ChatPage from "./pages/ChatPage";
import ClientDashboard from "./pages/ClientDashboard";
import FavoritesPage from "./pages/FavoritesPage";
import LoginPage from "./pages/LoginPage";
import PlannerPage from "./pages/PlannerPage";
import ProviderDashboard from "./pages/ProviderDashboard";
import SignupPage from "./pages/SignupPage";
import { getStoredUser, hasRole } from "./services/auth";

const RequireRole = ({ role, children }) => {
  const user = getStoredUser();

  if (!hasRole(user, role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/client-dashboard"
          element={
            <RequireRole role="Client">
              <ClientDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/favorites"
          element={
            <RequireRole role="Client">
              <FavoritesPage />
            </RequireRole>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireRole role="Client">
              <ChatPage />
            </RequireRole>
          }
        />
        <Route
          path="/planner"
          element={
            <RequireRole role="Client">
              <PlannerPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole role="Admin">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/prestataire"
          element={
            <RequireRole role="Prestataire">
              <ProviderDashboard />
            </RequireRole>
          }
        />
        <Route path="/provider" element={<Navigate to="/prestataire" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
