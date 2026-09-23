import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import Logo from "../ui/Logo";

const navLinks = [
  { to: "/dashboard", label: "Your desk" },
  { to: "/upload", label: "Add notes" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative px-1 py-5 text-[0.95rem] font-bold transition-colors",
      isActive
        ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-highlight"
        : "text-ink-muted hover:text-ink"
    );

  return (
    <header className="sticky top-0 z-40 bg-paper border-b border-rule">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <Link to="/dashboard" aria-label="AdaptQuiz home">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-7" aria-label="Main">
              {navLinks.map(({ to, label }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-ink-muted truncate max-w-[220px]">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"
            >
              <LogOut className="w-4 h-4" aria-hidden />
              Sign out
            </button>
          </div>

          <button
            className="md:hidden p-2 -mr-2 rounded-md text-ink-soft hover:bg-ink/5"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-rule-soft bg-paper px-4 py-2 animate-fade-in">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn("block py-3 font-bold", isActive ? "text-ink" : "text-ink-muted")
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="border-t border-rule-soft mt-1 pt-2 pb-1">
            <p className="text-sm text-ink-muted truncate">{user?.email}</p>
            <button onClick={handleSignOut} className="py-3 font-bold text-marker">
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
