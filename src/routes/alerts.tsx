import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Bell, Syringe, Droplets, Wind } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  component: Alerts,
});

const ALERTS_EN = [
  {
    icon: Syringe,
    title: "Free Vaccination Drive",
    body: "Polio drops camp this Sunday at your local PHC. Children under 5 eligible.",
    tag: "Vaccination",
    color: "primary" as const,
  },
  {
    icon: Droplets,
    title: "Dengue Cases Rising",
    body: "Clear stagnant water around your home. Use mosquito nets at night.",
    tag: "Outbreak",
    color: "moderate" as const,
  },
  {
    icon: Wind,
    title: "Air Quality Poor (AQI 210)",
    body: "Avoid outdoor exercise. Children & elderly should stay indoors.",
    tag: "Environment",
    color: "trust" as const,
  },
];

const ALERTS_HI = [
  {
    icon: Syringe,
    title: "मुफ्त टीकाकरण शिविर",
    body: "इस रविवार आपके PHC पर पोलियो ड्रॉप शिविर। 5 साल से कम बच्चों के लिए।",
    tag: "टीकाकरण",
    color: "primary" as const,
  },
  {
    icon: Droplets,
    title: "डेंगू के मामले बढ़ रहे हैं",
    body: "घर के आसपास पानी जमा न होने दें। रात को मच्छरदानी का प्रयोग करें।",
    tag: "प्रकोप",
    color: "moderate" as const,
  },
  {
    icon: Wind,
    title: "हवा की गुणवत्ता खराब (AQI 210)",
    body: "बाहर व्यायाम न करें। बच्चे और बुजुर्ग घर के अंदर रहें।",
    tag: "पर्यावरण",
    color: "trust" as const,
  },
];

function Alerts() {
  const { lang } = useLanguage();
  const list = lang === "hi" ? ALERTS_HI : ALERTS_EN;
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    moderate: "bg-moderate/15 text-moderate-foreground",
    trust: "bg-trust/10 text-trust",
  };

  return (
    <MobileShell>
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">{t("alerts", lang)}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => {
          const Icon = a.icon;
          return (
            <Card key={i} className="rounded-3xl border-2 p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorMap[a.color]} shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground uppercase tracking-wider">
                    {a.tag}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold leading-tight">{a.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        {lang === "hi" ? "स्थान आधारित अलर्ट (डेमो डेटा)" : "Location-based alerts (demo data)"}
      </p>
    </MobileShell>
  );
}
