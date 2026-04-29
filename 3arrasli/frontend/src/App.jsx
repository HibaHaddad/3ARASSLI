import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./Home";
import SplashScreen from "./components/SplashScreen";
import ToastContainer from "./components/Toast";
import AdminDashboard from "./pages/AdminDashboard";
import AboutPage from "./pages/AboutPage";
import ChatPage from "./pages/ChatPage";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientPacksPage from "./pages/ClientPacksPage";
import ClientProviderPage from "./pages/ClientProviderPage";
import ClientReservationsPage from "./pages/ClientReservationsPage";
import ClientSearchPage from "./pages/ClientSearchPage";
import ConditionsPage from "./pages/ConditionsPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import FavoritesPage from "./pages/FavoritesPage";
import LoginPage from "./pages/LoginPage";
import PlannerPage from "./pages/PlannerPage";
import ProviderDashboard from "./pages/ProviderDashboard";
import PublicSignaturePage from "./pages/PublicSignaturePage";
import SignupPage from "./pages/SignupPage";
import { getStoredUser, hasRole } from "./services/auth";

const RequireRole = ({ role, children }) => {
  const user = getStoredUser();

  if (!hasRole(user, role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const SPLASH_VISIBLE_MS = 1900;
const SPLASH_EXIT_MS = 540;

const App = () => {
  const [splash, setSplash] = useState({ visible: true, exiting: false });
  const splashTimers = useRef([]);

  const clearSplashTimers = useCallback(() => {
    splashTimers.current.forEach((timerId) => window.clearTimeout(timerId));
    splashTimers.current = [];
  }, []);

  const showSplash = useCallback(() => {
    clearSplashTimers();
    setSplash({ visible: true, exiting: false });

    splashTimers.current = [
      window.setTimeout(() => {
        setSplash((current) => ({ ...current, exiting: true }));
      }, SPLASH_VISIBLE_MS),
      window.setTimeout(() => {
        setSplash({ visible: false, exiting: false });
      }, SPLASH_VISIBLE_MS + SPLASH_EXIT_MS),
    ];
  }, [clearSplashTimers]);

  useEffect(() => {
    showSplash();
    return clearSplashTimers;
  }, [clearSplashTimers, showSplash]);

  useEffect(() => {
    window.addEventListener("arrasli:show-splash", showSplash);
    return () => window.removeEventListener("arrasli:show-splash", showSplash);
  }, [showSplash]);

  return (
    <BrowserRouter>
      {splash.visible ? <SplashScreen isExiting={splash.exiting} /> : null}
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/client-dashboard" element={<Navigate to="/client" replace />} />
        <Route path="/search" element={<Navigate to="/client/search" replace />} />
        <Route path="/favorites" element={<Navigate to="/client/favorites" replace />} />
        <Route path="/packs" element={<Navigate to="/client/packs" replace />} />
        <Route path="/chat" element={<Navigate to="/client/chat" replace />} />
        <Route path="/planner" element={<Navigate to="/client/planner" replace />} />
        <Route path="/reservations" element={<Navigate to="/client/reservations" replace />} />
        <Route path="/profile" element={<Navigate to="/client/profile" replace />} />
        <Route
          path="/client"
          element={
            <RequireRole role="Client">
              <ClientDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/client/profile"
          element={
            <RequireRole role="Client">
              <ClientProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="/client/search"
          element={
            <RequireRole role="Client">
              <ClientSearchPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/provider/:id"
          element={
            <RequireRole role="Client">
              <ClientProviderPage />
            </RequireRole>
          }
        />
        <Route
          path="/provider/:id"
          element={
            <RequireRole role="Client">
              <ClientProviderPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/reservations"
          element={
            <RequireRole role="Client">
              <ClientReservationsPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/packs"
          element={
            <RequireRole role="Client">
              <ClientPacksPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/favorites"
          element={
            <RequireRole role="Client">
              <FavoritesPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/chat"
          element={
            <RequireRole role="Client">
              <ChatPage />
            </RequireRole>
          }
        />
        <Route
          path="/client/planner"
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
        <Route path="/public/sign-contract" element={<PublicSignaturePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
