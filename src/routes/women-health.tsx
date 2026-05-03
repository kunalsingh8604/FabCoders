import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { 
  ChevronLeft, Droplets, Baby, Info, History, 
  Plus, Save, CheckCircle2, CalendarDays, ShieldPlus, Activity,
  AlertTriangle
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { format, addDays, differenceInDays, startOfDay, isWithinInterval, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/women-health")({
  component: WomenHealth,
});

type PeriodRecord = {
  id: string;
  start_date: string;
  end_date: string;
};

function WomenHealth() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPeriod, setLastPeriod] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // For adding new record
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showAdd, setShowAdd] = useState(false);

  // Stats
  const [avgCycle, setAvgCycle] = useState(28);
  const [avgDuration, setAvgDuration] = useState(5);
  const [nextPeriodDate, setNextPeriodDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    if (!user) return;
    try {
      // For demo, we try to fetch from Supabase, but use localStorage as fallback if table doesn't exist
      const { data, error } = await supabase
        .from("period_records" as any)
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        // Fallback to localStorage
        const local = localStorage.getItem(`periods_${user.id}`);
        if (local) setRecords(JSON.parse(local));
      } else {
        setRecords(data as any || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();
  }, [records]);

  const calculateStats = () => {
    if (records.length === 0) {
      setAvgCycle(28);
      setAvgDuration(5);
      setNextPeriodDate(null);
      return;
    }

    // Calculate average duration
    const totalDuration = records.reduce((acc, r) => acc + differenceInDays(new Date(r.end_date), new Date(r.start_date)) + 1, 0);
    setAvgDuration(Math.round(totalDuration / records.length) || 5);

    if (records.length < 2) {
      setAvgCycle(28);
      setNextPeriodDate(addDays(new Date(records[0].start_date), 28));
      return;
    }

    // Calculate average gap between start dates
    const sorted = [...records].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    let totalGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalGap += differenceInDays(new Date(sorted[i].start_date), new Date(sorted[i-1].start_date));
    }
    const avg = Math.round(totalGap / (sorted.length - 1)) || 28;
    setAvgCycle(avg);
    
    const lastStart = new Date(sorted[sorted.length - 1].start_date);
    setNextPeriodDate(addDays(lastStart, avg));
  };

  const saveRecord = async () => {
    if (!selectedRange.from || !selectedRange.to || !user) {
      toast.error("Please select start and end dates");
      return;
    }

    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      start_date: format(selectedRange.from, "yyyy-MM-dd"),
      end_date: format(selectedRange.to, "yyyy-MM-dd"),
    };

    try {
      const { error } = await supabase.from("period_records" as any).insert(newRecord);
      
      // Update local state and storage
      const updated = [newRecord, ...records];
      setRecords(updated);
      localStorage.setItem(`periods_${user.id}`, JSON.stringify(updated));
      
      setShowAdd(false);
      setSelectedRange({ from: undefined, to: undefined });
      toast.success(lang === "hi" ? "रिकॉर्ड सहेज लिया गया" : "Period recorded successfully");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  // Calendar Modifiers
  const periodDays = records.flatMap(r => {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const days = [];
    let curr = start;
    while (curr <= end) {
      days.push(new Date(curr));
      curr = addDays(curr, 1);
    }
    return days;
  });

  const predictedDays = nextPeriodDate ? Array.from({ length: 5 }).map((_, i) => addDays(nextPeriodDate, i)) : [];

  return (
    <MobileShell>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/services">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">{t("womenHealth", lang)}</h2>
      </div>

      <Tabs defaultValue="period" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="period" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Droplets className="h-4 w-4 mr-1 md:mr-2" /> 
            <span>Tracker</span>
          </TabsTrigger>
          <TabsTrigger value="pregnancy" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Baby className="h-4 w-4 mr-1 md:mr-2" />
            <span>Pregnancy</span>
          </TabsTrigger>
          <TabsTrigger value="anemia" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="h-4 w-4 mr-1 md:mr-2" />
            <span>Anemia</span>
          </TabsTrigger>
        </TabsList>

        {/* Period Tracker Tab */}
        <TabsContent value="period" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* Header Card with Prediction */}
          <Card className="p-10 text-center rounded-[3rem] border-none bg-blue-50/50 text-blue-950 shadow-2xl relative overflow-hidden ring-4 ring-blue-100 animate-in zoom-in-95 duration-500">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform text-blue-900">
                <Droplets className="h-32 w-32" />
             </div>
             
             <div className="relative z-10">
               <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-3 text-blue-800/80">
                 {lang === "hi" ? "अगली पीरियड की तारीख" : "Predicted Next Period"}
               </p>
               <h3 className="text-5xl font-black mb-6 drop-shadow-sm tracking-tight text-blue-950">
                 {nextPeriodDate 
                   ? format(nextPeriodDate, "MMMM dd") 
                   : (lang === "hi" ? "डेटा आवश्यक है" : "More data needed")}
               </h3>
               
               <div className="flex flex-wrap items-center justify-center gap-3">
                 <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-100/50 px-5 py-2.5 text-xs font-black border border-blue-200/50 text-blue-900">
                    <CalendarDays className="h-4 w-4" /> 
                    {avgCycle} {lang === "hi" ? "दिन का चक्र" : "Day Cycle"}
                 </div>
                 <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-100/50 px-5 py-2.5 text-xs font-black border border-blue-200/50 text-blue-900">
                    <Droplets className="h-4 w-4" /> 
                    {avgDuration} {lang === "hi" ? "दिन की अवधि" : "Day Period"}
                 </div>
               </div>
             </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
             <Button 
                onClick={() => setShowAdd(!showAdd)} 
                variant={showAdd ? "secondary" : "default"}
                className="flex-1 h-14 rounded-2xl shadow-lg font-bold"
             >
                {showAdd ? (lang === "hi" ? "रद्द करें" : "Cancel") : <><Plus className="mr-2 h-5 w-5" /> {t("recordPeriod", lang)}</>}
             </Button>
          </div>

          {/* Add Form / Calendar View */}
          {showAdd ? (
            <Card className="p-4 rounded-3xl border-2 border-primary/20 bg-card shadow-xl animate-in slide-in-from-top-4">
               <div className="mb-4 text-center">
                  <h4 className="font-bold text-lg">{t("recordPeriod", lang)}</h4>
                  <p className="text-xs text-muted-foreground">Select start and end dates on the calendar</p>
               </div>
               <Calendar
                 mode="range"
                 selected={selectedRange as any}
                 onSelect={(range: any) => setSelectedRange(range || { from: undefined, to: undefined })}
                 className="rounded-2xl border mx-auto"
               />
               <Button 
                 onClick={saveRecord} 
                 disabled={!selectedRange.from || !selectedRange.to}
                 className="w-full mt-4 h-12 rounded-xl font-bold"
               >
                 <Save className="mr-2 h-4 w-4" /> {lang === "hi" ? "सुरक्षित करें" : "Save Record"}
               </Button>
            </Card>
          ) : (
            <Card className="p-4 rounded-3xl border shadow-md">
               <div className="mb-3 flex items-center justify-between px-2">
                  <h4 className="font-bold">{lang === "hi" ? "साइकिल कैलेंडर" : "Cycle Calendar"}</h4>
                  <div className="flex gap-3 text-[10px] font-bold uppercase">
                     <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-primary" /> Period</div>
                     <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-pink-300" /> Predicted</div>
                  </div>
               </div>
               <Calendar
                 mode="single"
                 modifiers={{
                   period: periodDays,
                   predicted: predictedDays,
                 }}
                 modifiersClassNames={{
                   period: "bg-blue-100 text-blue-900 font-bold rounded-full",
                   predicted: "bg-pink-50 text-pink-600 rounded-full border-2 border-dashed border-pink-200",
                 }}
                 className="rounded-2xl border-none mx-auto"
               />
            </Card>
          )}

          {/* Stats & Tips */}
          <div className="grid grid-cols-2 gap-4">
             <StatCard label={lang === "hi" ? "औसत चक्र" : "Avg Cycle"} value={`${avgCycle} Days`} icon={<CalendarDays className="h-4 w-4" />} />
             <StatCard label={lang === "hi" ? "औसत अवधि" : "Avg Duration"} value={`${avgDuration} Days`} icon={<Droplets className="h-4 w-4" />} />
          </div>

          <Card className="p-6 rounded-3xl border-2 border-primary/10 bg-primary/5">
             <div className="flex items-start gap-4">
                <div className="bg-primary/20 p-3 rounded-2xl text-primary">
                   <Info className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="font-bold mb-1">{lang === "hi" ? "स्वास्थ्य टिप" : "Health Tip"}</h4>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {lang === "hi" ? "नियमित ट्रैकिंग से आपको अपने शरीर के बदलावों को समझने में मदद मिलती है।" : "Regular tracking helps you understand your body patterns better. Swasthya AI will alert you 2 days before your predicted date."}
                   </p>
                </div>
             </div>
          </Card>
        </TabsContent>

        {/* Pregnancy Tab (Functional Placeholder) */}
        <TabsContent value="pregnancy" className="space-y-6">
           <Card className="p-6 rounded-3xl border-2 border-primary/10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold flex items-center gap-2">
                   <Baby className="h-5 w-5 text-primary" /> 
                   {lang === "hi" ? "गर्भावस्था मार्गदर्शिका" : "Pregnancy Guidance"}
                </h4>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Week 12</div>
              </div>
              
              <div className="space-y-4">
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-sm font-bold text-muted-foreground mb-2 block">
                       {lang === "hi" ? "अपनी अंतिम पीरियड की तारीख चुनें" : "Select your Last Period Date (LMP)"}
                    </label>
                    <Input 
                       type="date" 
                       value={lastPeriod} 
                       onChange={(e) => setLastPeriod(e.target.value)}
                       className="h-12 rounded-xl"
                    />
                 </div>

                 <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                       {lang === "hi" ? "अनुमानित डिलीवरी की तारीख" : "Estimated Due Date (EDC)"}
                    </p>
                    <h5 className="text-3xl font-black text-primary">
                       {format(addDays(new Date(lastPeriod), 280), "MMMM dd, yyyy")}
                    </h5>
                    <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                       <ShieldPlus className="h-3 w-3" /> 40 Weeks Pregnancy cycle
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                    <GuidanceItem title="Nutrition" desc="Focus on Iron and Calcium rich foods." status="complete" />
                    <GuidanceItem title="Upcoming Test" desc="Anomaly scan recommended at 18-20 weeks." status="pending" />
                 </div>
              </div>
           </Card>


        </TabsContent>

        {/* Anemia Tab - Functional Screening */}
        <TabsContent value="anemia" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
           <AnemiaScreening lang={lang} />
        </TabsContent>
      </Tabs>
    </MobileShell>
  );
}

function AnemiaScreening({ lang }: { lang: string }) {
    const [checked, setChecked] = useState<number[]>([]);
    const symptoms = [
        { t: "Extreme Fatigue", hi: "अत्यधिक थकान" },
        { t: "Pale Skin", hi: "पीली त्वचा" },
        { t: "Shortness of Breath", hi: "सांस की तकलीफ" },
        { t: "Cold Hands/Feet", hi: "ठंडे हाथ-पांव" },
        { t: "Chest Pain", hi: "सीने में दर्द" }
    ];

    const toggle = (i: number) => {
        if (checked.includes(i)) setChecked(checked.filter(x => x !== i));
        else setChecked([...checked, i]);
    };

    const risk = checked.length === 0 ? "low" : checked.length > 3 ? "high" : "moderate";

    return (
        <Card className="p-6 rounded-3xl border-destructive/20 bg-destructive/5 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4 text-destructive">
               <AlertTriangle className="h-6 w-6" />
               <h4 className="text-lg font-bold">{t("anemiaAlert", lang)}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {lang === "hi" ? "इन लक्षणों की जांच करें:" : "Anemia is a major health concern. Please select any symptoms you are experiencing:"}
            </p>
            
            <div className="space-y-3">
               {symptoms.map((s, i) => (
                 <button 
                    key={i} 
                    onClick={() => toggle(i)}
                    className={cn(
                        "flex w-full items-center justify-between p-4 rounded-2xl transition-all shadow-sm border",
                        checked.includes(i) ? "bg-destructive/10 border-destructive/30" : "bg-white border-destructive/10"
                    )}
                 >
                    <span className="text-sm font-medium">{lang === "hi" ? s.hi : s.t}</span>
                    <div className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center", checked.includes(i) ? "bg-destructive border-destructive" : "border-destructive/20")}>
                        {checked.includes(i) && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                 </button>
               ))}
            </div>

            <div className={cn("mt-8 p-6 rounded-2xl text-center", risk === "high" ? "bg-destructive text-white" : risk === "moderate" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800")}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1">Current Risk Level</p>
                <h5 className="text-2xl font-black">{risk.toUpperCase()}</h5>
                <p className="text-xs mt-2 opacity-80">
                    {risk === "high" 
                        ? (lang === "hi" ? "कृपया तुरंत डॉक्टर से संपर्क करें।" : "Please consult a doctor immediately for a blood test.") 
                        : (lang === "hi" ? "अपने आहार में सुधार करें और निगरानी रखें।" : "Monitor your symptoms and maintain an iron-rich diet.")}
                </p>
            </div>
            
            <Button className="w-full mt-6 h-14 rounded-2xl font-bold bg-destructive text-white shadow-lg" onClick={() => window.location.href = "/nearby"}>
               {lang === "hi" ? "नज़दीकी लैब खोजें" : "Find Nearby Lab"}
            </Button>
        </Card>
    );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: any }) {
    return (
        <Card className="p-4 rounded-2xl border-2 border-primary/5 bg-card flex flex-col items-center justify-center text-center shadow-sm">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                {icon}
            </div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
            <p className="text-sm font-bold text-foreground">{value}</p>
        </Card>
    )
}

function GuidanceItem({ title, desc, status }: { title: string, desc: string, status: "complete" | "pending" }) {
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-card border shadow-sm">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", status === "complete" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                {status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            </div>
            <div className="flex-1">
                <p className="text-xs font-bold">{title}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
        </div>
    )
}
