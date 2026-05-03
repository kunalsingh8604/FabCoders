import { Link, useLocation } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import { Stethoscope, MapPin, ScanLine, Bell, History, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/check", icon: Stethoscope, key: "symptomChecker" as const },
  { to: "/scan", icon: ScanLine, key: "prescription" as const },
  { to: "/services", icon: LayoutGrid, key: "services" as const },

  { to: "/nearby", icon: MapPin, key: "nearby" as const },
];

export function BottomNav() {
  const { lang } = useLanguage();
  const loc = useLocation();
  return (
    <nav className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-screen-md grid-cols-4">
        {items.map(({ to, icon: Icon, key }) => {
          const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="leading-none">{t(key, lang)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
