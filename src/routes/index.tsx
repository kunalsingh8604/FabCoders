import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stethoscope, MapPin, ScanLine, Bell, History, ShieldCheck, Heart, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { lang } = useLanguage();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const goCheck = () => {
    if (!user) nav({ to: "/auth", search: { redirect: "/check" } });
    else nav({ to: "/check" });
  };

  return (
    <MobileShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-card p-8 shadow-2xl transition-all md:p-14 lg:p-20">
        {/* Background Visual Decoration */}
        <div className="absolute right-[-10%] top-[-10%] z-0 h-[120%] w-[60%] opacity-20 md:opacity-40">
          <img
            src="/medical_3d_visual_1777132524927.png"
            alt=""
            className="h-full w-full animate-float object-cover grayscale-[0.5] contrast-125"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-10 md:flex-row md:justify-between">
          <div className="max-w-2xl text-center md:text-left">
            <div className="mb-6 flex items-center justify-center gap-4 md:justify-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20">
                <Heart className="h-8 w-8" fill="currentColor" />
              </div>
              <span className="text-xl font-black tracking-tighter text-primary/80 uppercase">{t("appName", lang)}</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Smarter <span className="text-primary">Healthcare</span><br />
              Better Living
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl lg:max-w-md">
              Comprehensive digital health solutions empowering patient care, preventive measures, and personalized wellness.
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-4 md:w-auto md:min-w-[320px]">
            <Button
              onClick={goCheck}
              size="lg"
              className="h-20 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-[0_20px_50px_rgba(88,103,221,0.3)] transition-all hover:scale-[1.03] hover:shadow-[0_25px_60px_rgba(88,103,221,0.4)] active:scale-[0.97]"
            >
              <Stethoscope className="mr-3 h-7 w-7" />
              {t("startCheck", lang)}
            </Button>
            
            <div className="flex items-center gap-6">
               <button className="text-sm font-bold text-trust hover:text-primary transition-colors uppercase tracking-widest">{t("signIn", lang)}</button>
               <div className="h-4 w-px bg-border" />
               <button className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Book Consultation</button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8 lg:mt-16">
        <FeatureTile to="/check" icon={Stethoscope} label={t("symptomChecker", lang)} accent="primary" />

        <FeatureTile to="/scan" icon={ScanLine} label={t("prescription", lang)} accent="primary" />
        <FeatureTile to="/services" icon={LayoutGrid} label={t("services", lang)} accent="moderate" />
        <FeatureTile to="/nearby" icon={MapPin} label={t("nearby", lang)} accent="trust" />
        <FeatureTile to="/history" icon={History} label={t("history", lang)} accent="mild" />
      </section>

      {/* Trust Quote / Personalized Care Section */}
      <div className="mt-12 overflow-hidden rounded-[2.5rem] border bg-gradient-to-r from-primary/5 to-trust/5 p-8 md:p-12">
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="relative h-32 w-52 shrink-0 overflow-hidden rounded-2xl md:h-40 md:w-64">
            <img src="/molecular_3d_component_1777132590575.png" alt="Personalized Care" className="h-full w-full object-cover" />
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-foreground">Personalized Care</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base md:max-w-xl">
              Personalized health journeys driven by data, designed to support and enhance your well-being through advanced AI diagnostics.
            </p>
          </div>
        </div>
      </div>

    </MobileShell>
  );
}

function FeatureTile({
  to,
  icon: Icon,
  label,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: "primary" | "trust" | "moderate" | "mild";
}) {
  const map = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    trust: "from-trust/10 to-trust/5 text-trust border-trust/20",
    moderate: "from-moderate/15 to-moderate/5 text-moderate border-moderate/30",
    mild: "from-mild/15 to-mild/5 text-mild border-mild/30",
  } as const;
  
  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border bg-gradient-to-br p-8 text-center shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl md:p-10 md:gap-8",
        map[accent]
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl transition-transform group-hover:scale-110 md:h-20 md:w-20">
        <Icon className="h-8 w-8 md:h-10 md:w-10" />
      </div>
      <span className="text-base font-extrabold tracking-tight md:text-lg">{label}</span>
    </Link>
  );
}
