import { Routes, Route } from "react-router-dom";
import { StoreProvider } from "./store/store-context";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateTripPage } from "./pages/CreateTripPage";
import { TripResultsPage } from "./pages/TripResultsPage";
import { TripDetailPage } from "./pages/TripDetailPage";

export function App() {
  return (
    <StoreProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/trips/new" element={<CreateTripPage />} />
          <Route path="/trips/:tripId/results" element={<TripResultsPage />} />
          <Route
            path="/trips/:tripId/results/:opportunityId"
            element={<TripDetailPage />}
          />
        </Routes>
      </AppShell>
    </StoreProvider>
  );
}
