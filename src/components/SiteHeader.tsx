import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBag, Sparkles } from "lucide-react";

export default function SiteHeader() {
  const { role, logout } = useAuth();
  const { count } = useCart();
  const loc = useLocation();
  const nav = useNavigate();

  if (loc.pathname === "/login") return null;

  const links = role === "admin"
    ? [{ to: "/admin", label: "Dashboard" }, { to: "/catalog", label: "Catalog" }, { to: "/contact", label: "Contact" }]
    : role === "transport"
      ? [{ to: "/transport", label: "Transport" }, { to: "/contact", label: "Contact" }]
      : [{ to: "/catalog", label: "Catalog" }, { to: "/profile", label: "Profile" }, { to: "/contact", label: "Contact" }];

  const homePath = role === "admin" ? "/admin" : role === "transport" ? "/transport" : "/catalog";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to={homePath} className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero shadow-elegant">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight">SilkRoute</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Heritage Sarees</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = loc.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-smooth ${
                  active ? "text-primary bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {role === "admin" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full gradient-gold text-accent-foreground">
              Admin
            </span>
          )}
          {role === "transport" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
              Transport
            </span>
          )}
          {role !== "admin" && role !== "transport" && (
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-secondary transition-smooth"
              aria-label="Cart"
            >
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={() => { logout(); nav("/login"); }}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
