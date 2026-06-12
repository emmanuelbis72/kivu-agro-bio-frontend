import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden h-screen lg:sticky lg:top-0 lg:block">
        <Sidebar />
      </div>
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <div className="relative h-full">
            <Sidebar
              mobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
