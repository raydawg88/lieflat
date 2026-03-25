import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold text-gray-900">LieFlat</span>
            <span className="text-xs text-gray-400 font-medium mt-1">
              BETA
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                location.pathname === "/"
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/trips/new"
              className="text-sm font-medium px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              + New Trip
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          LieFlat — Luxury flights at economy prices. Decision engine with
          pluggable data providers.
        </div>
      </footer>
    </div>
  );
}
