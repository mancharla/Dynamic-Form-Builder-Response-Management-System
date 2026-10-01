import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import AppLayout from "../layouts/AppLayout";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import FormsPage from "../pages/forms/FormsPage";
import FormBuilderPage from "../pages/forms/FormBuilderPage";
import ResponsesPage from "../pages/responses/ResponsesPage";
const AnalyticsPage = lazy(() => import("../pages/analytics/AnalyticsPage"));
const ActivityLogsPage = lazy(() => import("../pages/activity-logs/ActivityLogsPage"));
const PublicFormPage = lazy(() => import("../pages/public/PublicFormPage"));

const RouteLoading = () => (
  <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
    <CircularProgress size={24} />
  </Box>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/f/:slug"
        element={
          <Suspense fallback={<RouteLoading />}>
            <PublicFormPage />
          </Suspense>
        }
      />

      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/forms" element={<FormsPage />} />

          {/* Form Builder stays INSIDE AppLayout */}
          <Route
            path="/forms/:formId/builder"
            element={<FormBuilderPage />}
          />

          <Route
            path="/responses"
            element={<ResponsesPage />}
          />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<RouteLoading />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <Suspense fallback={<RouteLoading />}>
                <ActivityLogsPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* Default Routes */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
};

export default AppRoutes;