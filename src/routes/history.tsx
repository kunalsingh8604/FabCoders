import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trash2, AlertTriangle, Clock, Sparkles, 
  FileText, ScanLine, Droplets, CalendarDays, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  component: () => (
    <RequireAuth redirect="/history">
      <HistoryPage />
    </RequireAuth>
  ),
});

type Report = {
  id: string;
  symptoms: string;
  severity: "emergency" | "moderate" | "mild";
  advice: string;
  created_at: string;
};

type Scan = {
  id: string;
  image_url: string;
  simplified_explanation: string;
  created_at: string;
};

type PeriodRecord = {
  id: string;
  start_date: string;
  end_date: string;
};

function HistoryPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reportsRes, scansRes, periodsRes] = await Promise.all([
        supabase.from("symptom_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("prescription_scans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("period_records" as any).select("*").eq("user_id", user.id).order("start_date", { ascending: false })
      ]);

      if (reportsRes.data) setReports(reportsRes.data as Report[]);
      if (scansRes.data) setScans(scansRes.data as Scan[]);
      if (periodsRes.data) setPeriods(periodsRes.data as PeriodRecord[]);
      
      // Local fallback for periods
      if (!periodsRes.data) {
        const local = localStorage.getItem(`periods_${user.id}`);
        if (local) setPeriods(JSON.parse(local));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  const deleteItem = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      if (table === "symptom_reports") setReports(r => r.filter(x => x.id !== id));
      if (table === "prescription_scans") setScans(s => s.filter(x => x.id !== id));
      if (table === "period_records") setPeriods(p => p.filter(x => x.id !== id));
      toast.success("Record removed");
    }
  };

  const sevConfig = {
    emergency: { label: t("emergency", lang), icon: AlertTriangle, cls: "bg-emergency text-emergency-foreground" },
    moderate: { label: t("moderate", lang), icon: Clock, cls: "bg-moderate text-moderate-foreground" },
    mild: { label: t("mild", lang), icon: Sparkles, cls: "bg-mild text-mild-foreground" },
  };

  return (
    <MobileShell>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("history", lang)}</h2>
        <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading} className="rounded-xl">
           <Clock className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> {loading ? "..." : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="triage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="triage" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4 mr-1 md:mr-2" /> 
            <span className="text-[10px] md:text-xs">Triage</span>
          </TabsTrigger>
          <TabsTrigger value="scans" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ScanLine className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-[10px] md:text-xs">Scans</span>
          </TabsTrigger>
          <TabsTrigger value="women" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Droplets className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-[10px] md:text-xs">Women</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triage" className="space-y-4 animate-in fade-in duration-300">
           {reports.length === 0 ? (
             <EmptyState icon={<FileText />} text={t("noReports", lang)} />
           ) : (
             reports.map(r => (
               <HistoryCard 
                  key={r.id}
                  title={r.symptoms}
                  desc={r.advice}
                  date={r.created_at}
                  badge={sevConfig[r.severity]}
                  onDelete={() => deleteItem("symptom_reports", r.id)}
               />
             ))
           )}
        </TabsContent>

        <TabsContent value="scans" className="space-y-4 animate-in fade-in duration-300">
           {scans.length === 0 ? (
             <EmptyState icon={<ScanLine />} text="No scanned prescriptions yet." />
           ) : (
             scans.map(s => (
               <HistoryCard 
                  key={s.id}
                  title="Prescription Scan"
                  desc={s.simplified_explanation}
                  date={s.created_at}
                  image={s.image_url}
                  onDelete={() => deleteItem("prescription_scans", s.id)}
               />
             ))
           )}
        </TabsContent>

        <TabsContent value="women" className="space-y-4 animate-in fade-in duration-300">
           {periods.length === 0 ? (
             <EmptyState icon={<Droplets />} text="No period records found." />
           ) : (
             periods.map(p => (
               <HistoryCard 
                  key={p.id}
                  title={`Period Cycle: ${p.start_date}`}
                  desc={`Ended on: ${p.end_date}`}
                  date={p.start_date}
                  badge={{ label: "Period", icon: CalendarDays, cls: "bg-primary/10 text-primary" }}
                  onDelete={() => deleteItem("period_records", p.id)}
               />
             ))
           )}
        </TabsContent>
      </Tabs>
    </MobileShell>
  );
}

function HistoryCard({ title, desc, date, badge, image, onDelete }: any) {
  return (
    <Card className="rounded-3xl border-2 p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md group">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {badge && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm", badge.cls)}>
              <badge.icon className="h-3 w-3" /> {badge.label}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all" 
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-4">
        {image && (
          <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden border bg-muted">
            <img src={image} alt="Scan" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <p className="line-clamp-1 text-sm font-black leading-tight text-foreground">{title}</p>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
          <div className="pt-2 flex items-center justify-between border-t border-dashed">
            <p className="text-[10px] font-bold text-muted-foreground/60">
              {date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium' }) : "N/A"}
            </p>
            {image && (
              <Button variant="link" className="h-auto p-0 text-[10px] font-bold text-primary flex items-center gap-1">
                View Full <ExternalLink className="h-2 w-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon, text }: any) {
  return (
    <Card className="rounded-3xl p-12 text-center border-dashed border-2 bg-muted/5">
      <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
        {icon}
      </div>
      <p className="text-sm font-bold text-muted-foreground">{text}</p>
    </Card>
  );
}
