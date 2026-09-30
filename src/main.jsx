import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VolunteerDashboard from "./VolunteerDashboard.jsx";
import CitizenDashboard from "./pages/CitizenDashboard.jsx";
import NgoDashboard from "./pages/NgoDashboard.jsx";
import TrackReport from "./pages/TrackReport.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitizenDashboard />} />
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/track" element={<TrackReport />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/command" element={<ProtectedRoute role="AUTHORITY"><App /></ProtectedRoute>} />
        <Route path="/volunteer" element={<ProtectedRoute role="VOLUNTEER"><VolunteerDashboard /></ProtectedRoute>} />
        <Route path="/ngo" element={<ProtectedRoute role="NGO"><NgoDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
