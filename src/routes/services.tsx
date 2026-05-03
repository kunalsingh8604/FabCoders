import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { 
  Bell, History, CalendarClock, Heart, 
  ChevronRight, Activity
} from "lucide-react";

export const Route = createFileRoute("/services")({
  component: ServicesHub,
});

function ServicesHub() {
  const { lang } = useLanguage();

  const services = [
    {
      to: "/reminders",
      icon: CalendarClock,
      title: t("medReminders", lang),
      desc: lang === "hi" ? "दवा और डॉक्टर अपॉइंटमेंट" : "Medication & Doctor visits",
      color: "bg-blue-500",
    },
    {
      to: "/women-health",
      icon: Heart,
      title: t("womenHealth", lang),
      desc: lang === "hi" ? "पीरियड ट्रैकर और गर्भावस्था" : "Period tracker & Pregnancy",
      color: "bg-pink-500",
    },
    {
      to: "/alerts",
      icon: Bell,
      title: t("alerts", lang),
      desc: lang === "hi" ? "स्वास्थ्य अलर्ट और सूचनाएं" : "Health alerts & notifications",
      color: "bg-orange-500",
    },
    {
      to: "/history",
      icon: History,
      title: t("history", lang),
      desc: lang === "hi" ? "आपकी पिछली रिपोर्ट्स" : "Your previous health records",
      color: "bg-teal-500",
    },
  ];

  return (
    <MobileShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("services", lang)}</h2>
          <p className="text-sm text-muted-foreground">
            {lang === "hi" ? "अतिरिक्त स्वास्थ्य सेवाएं और टूल्स" : "Additional health services and tools"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {services.map((s, i) => (
            <Link key={i} to={s.to}>
              <Card className="group relative overflow-hidden rounded-3xl border-2 p-5 transition-all hover:border-primary/40 hover:shadow-xl active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color} text-white shadow-lg`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>


      </div>
    </MobileShell>
  );
}
