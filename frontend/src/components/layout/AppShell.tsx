import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  MessageCircle,
  SlidersHorizontal,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/analysis", label: "Business Analysis", icon: LineChart },
  { to: "/app/advisor", label: "AI Advisor", icon: MessageCircle },
  { to: "/app/simulator", label: "What-if Simulator", icon: SlidersHorizontal },
  { to: "/app/reports", label: "Reports", icon: FileText },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

// Keep every destination available on mobile; the bar scrolls on very narrow screens.
const MOBILE_ITEMS = NAV_ITEMS;

export function AppShell() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background dark:bg-[#0B1220]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white dark:bg-[#0F1729] dark:border-slate-800 md:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <TrendingUp size={18} />
          </div>
          <span className="text-base font-semibold text-ink dark:text-slate-100">BizWise AI</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-ink-secondary hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 dark:border-slate-800">
          <div className="mb-2 truncate px-3 text-xs text-ink-secondary">{user?.email}</div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4 dark:bg-[#0F1729] dark:border-slate-800 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
              <TrendingUp size={16} />
            </div>
            <span className="font-semibold text-ink dark:text-slate-100">BizWise AI</span>
          </div>
          <button onClick={signOut} className="text-ink-secondary" aria-label="Log out">
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-border bg-white dark:bg-[#0F1729] dark:border-slate-800 md:hidden">
          {MOBILE_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 min-w-16 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                  isActive ? "text-primary" : "text-ink-secondary dark:text-slate-500"
                )
              }
            >
              <item.icon size={20} />
              {item.label.split(" ")[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
