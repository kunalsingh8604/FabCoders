import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function MobileShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen bg-health-gradient selection:bg-primary selection:text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col bg-background/60 shadow-[0_0_100px_rgba(0,0,0,0.05)] backdrop-blur-3xl md:ring-1 md:ring-white/40">
        <AppHeader />
        <main className="flex-1 px-6 py-10 md:px-12 lg:px-20">{children}</main>
        {!hideNav && (
          <div className="md:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
