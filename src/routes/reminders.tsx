import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, Calendar, Clock, Pill, User, 
  Trash2, BellRing, ChevronLeft, Activity
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reminders")({
  component: Reminders,
});

type Reminder = {
  id: string;
  type: "medication" | "appointment";
  title: string;
  time: string; // HH:mm format
  date?: string;
  doctor?: string;
  notified?: boolean;
};

function Reminders() {
  const { lang } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", type: "medication", title: "Paracetamol 500mg", time: "08:00" },
    { id: "2", type: "appointment", title: "Monthly Checkup", time: "10:30", date: "2024-05-15", doctor: "Dr. Sharma" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newType, setNewType] = useState<"medication" | "appointment">("medication");

  // Real-time Notification Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      setReminders(prev => prev.map(r => {
        if (r.time === currentTime && !r.notified) {
          // Trigger Real-time Popup
          toast(r.title, {
            description: r.type === "medication" 
              ? (lang === "hi" ? "दवा लेने का समय हो गया है!" : "It's time to take your medicine!") 
              : (lang === "hi" ? "आपका अपॉइंटमेंट शुरू होने वाला है!" : "Your appointment is starting now!"),
            icon: r.type === "medication" ? <Pill className="h-5 w-5 text-primary" /> : <Calendar className="h-5 w-5 text-primary" />,
            duration: 10000,
            action: {
              label: lang === "hi" ? "ठीक है" : "Acknowledge",
              onClick: () => console.log("Notification acknowledged"),
            },
          });
          return { ...r, notified: true };
        }
        // Reset notification state if time has passed (to allow next day)
        if (r.time !== currentTime) {
          return { ...r, notified: false };
        }
        return r;
      }));
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [lang]);

  const addReminder = () => {
    if (!newTitle || !newTime) return;
    const r: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      type: newType,
      title: newTitle,
      time: newTime,
      notified: false,
    };
    setReminders([r, ...reminders]);
    setNewTitle("");
    setNewTime("");
    setShowAdd(false);
    toast.success(lang === "hi" ? "रिमाइंडर जोड़ दिया गया" : "Reminder added");
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
    toast.info(lang === "hi" ? "हटा दिया गया" : "Deleted");
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <MobileShell>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/services">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">{t("medReminders", lang)}</h2>
      </div>

      <div className="space-y-4">
        {/* Toggle Add */}
        {!showAdd ? (
          <Button 
            onClick={() => setShowAdd(true)} 
            className="w-full h-16 rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all shadow-sm"
            variant="outline"
          >
            <Plus className="mr-2 h-5 w-5" /> {t("addReminder", lang)}
          </Button>
        ) : (
          <Card className="p-6 rounded-3xl border-2 border-primary/20 bg-card/50 shadow-xl animate-in slide-in-from-top-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={newType === "medication" ? "default" : "outline"}
                  onClick={() => setNewType("medication")}
                  className="flex-1 rounded-xl"
                >
                  <Pill className="mr-2 h-4 w-4" /> {lang === "hi" ? "दवा" : "Medicine"}
                </Button>
                <Button 
                  size="sm" 
                  variant={newType === "appointment" ? "default" : "outline"}
                  onClick={() => setNewType("appointment")}
                  className="flex-1 rounded-xl"
                >
                  <User className="mr-2 h-4 w-4" /> {lang === "hi" ? "डॉक्टर" : "Doctor"}
                </Button>
              </div>
              <Input 
                placeholder={newType === "medication" ? (lang === "hi" ? "दवा का नाम" : "Medicine Name") : (lang === "hi" ? "अपॉइंटमेंट का नाम" : "Appointment Purpose")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-12 rounded-xl"
              />
              <Input 
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-12 rounded-xl"
              />
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={addReminder} className="flex-1 rounded-xl">Save</Button>
              </div>
            </div>
          </Card>
        )}

        {/* List */}
        <div className="space-y-3 mt-6">
          {reminders.map((r) => (
            <Card key={r.id} className="group overflow-hidden rounded-3xl border-none bg-card shadow-md transition-all hover:shadow-lg">
              <div className="flex items-center p-5">
                <div className={`mr-4 flex h-12 w-12 items-center justify-center rounded-2xl ${r.type === "medication" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                  {r.type === "medication" ? <Pill className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-base">{r.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(r.time)}</span>
                    {r.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.date}</span>}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={() => deleteReminder(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-muted/20 px-5 py-2.5 flex items-center justify-between">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> Active Monitoring
                 </span>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Live Tracker</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                 </div>
              </div>
            </Card>
          ))}
          {reminders.length === 0 && (
            <div className="py-20 text-center opacity-40">
              <Plus className="h-10 w-10 mx-auto mb-2" />
              <p>No reminders set</p>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
