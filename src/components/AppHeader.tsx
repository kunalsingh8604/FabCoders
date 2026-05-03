import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Heart, LogOut } from "lucide-react";

export function AppHeader() {
  const { lang, setLang } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Heart className="h-5 w-5" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">{t("appName", lang)}</span>
        </Link>

        <nav className="hidden md:ml-8 md:flex md:flex-1 md:items-center md:gap-6">
          <NavLink to="/check" label={t("symptomChecker", lang)} />
          <NavLink to="/scan" label={t("prescription", lang)} />
          <NavLink to="/nearby" label={t("nearby", lang)} />
          <NavLink to="/services" label={t("services", lang)} />
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="rounded-full border bg-background/50 px-3.5 py-1.5 text-xs font-bold transition-all hover:bg-accent active:scale-95"
            aria-label="Toggle language"
          >
            {lang === "en" ? "हिं" : "EN"}
          </button>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-9 w-9 rounded-full"
              aria-label={t("signOut", lang)}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary [&.active]:font-bold [&.active]:text-primary"
    >
      {label}
    </Link>
  );
}
