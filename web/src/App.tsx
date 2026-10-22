import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { SimulatedDataBadge } from "./components/SimulatedDataBadge";
import { RequireOperator } from "./components/RequireOperator";
import { HomePage } from "./pages/Home";
import { DemoPage } from "./pages/Demo";
import { AlertsPage } from "./pages/Alerts";
import { PlanPage } from "./pages/Plan";
import { RouteDetailPage } from "./pages/RouteDetail";
import { TripSharePage } from "./pages/TripShare";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold tracking-tight text-white hover:text-emerald-400">
              Transit<span className="text-emerald-400">IQ</span>
            </Link>
            <SimulatedDataBadge />
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link to="/plan" className="hover:text-white">
              Plan
            </Link>
            <Link to="/alerts" className="hover:text-white">
              Alerts
            </Link>
            <Link to="/report" className="hover:text-white">
              Report
            </Link>
            <Link to="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <Link to="/demo" className="hover:text-white">
              Demo
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4">{children}</main>
      <footer className="border-t border-slate-800 p-4 text-center text-xs text-slate-400">
        TransitIQ — Prototype for Lucknow (Simulated Data). All routes, buses, and reports are simulated.
      </footer>
    </div>
  );
}

function ReportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Anonymous Safety Feedback</h1>
      <p className="text-slate-300">Submit anonymous reports without personal tracking.</p>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Authority Dashboard</h1>
      <p className="text-slate-300">
        Real-time service reliability, stop risk ranking, and human review queue.
      </p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/route/:id" element={<RouteDetailPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/trip/:token" element={<TripSharePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route
        path="/demo"
        element={
          <RequireOperator>
            <DemoPage />
          </RequireOperator>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}
