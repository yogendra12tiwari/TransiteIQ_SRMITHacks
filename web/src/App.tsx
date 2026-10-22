import { BrowserRouter, Routes, Route, Link, useParams } from "react-router-dom";
import { SimulatedDataBadge } from "./components/SimulatedDataBadge";

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

function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Live Bus Tracking & Safety</h1>
      <p className="text-slate-300">
        Welcome to TransitIQ. Live bus tracking with an ETA uncertainty range and safety-first route planning.
      </p>
    </div>
  );
}

function PlanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Route Planner</h1>
      <p className="text-slate-300">Compare fastest vs safer routes with exposure minutes.</p>
    </div>
  );
}

function RouteDetailPage() {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Route Detail: {id}</h1>
      <p className="text-slate-300">View live buses, stops, wait-risk, and safe spots.</p>
    </div>
  );
}

function AlertsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Service Alerts</h1>
      <p className="text-slate-300">Delays, stalls, likely skips, and ghost bus notifications.</p>
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

function TripSharePage() {
  const { token } = useParams();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Live Shared Trip</h1>
      <p className="text-slate-300">Viewing shared trip token: {token}</p>
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

function DemoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Demo Controller</h1>
      <p className="text-slate-300">Operator simulator controls, time-of-day slider, and incident replay.</p>
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
      <Route path="/demo" element={<DemoPage />} />
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
