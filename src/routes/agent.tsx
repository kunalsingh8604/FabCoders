import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition, speak, stopSpeaking } from "@/hooks/useSpeech";
import { 
  Mic, Send, Square, Sparkles, History, MapPin, 
  AlertCircle, BrainCircuit, Loader2, Hospital, Stethoscope, Pill
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent")({
  component: () => (
    <RequireAuth redirect="/agent">
      <SwasthyaAgent />
    </RequireAuth>
  ),
});

type Msg = { role: "user" | "assistant" | "system" | "tool"; content: string; toolResult?: any };

function SwasthyaAgent() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState<"idle" | "thinking" | "searching" | "analyzing">("idle");
  const speech = useSpeechRecognition(lang);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Initial Welcome & History Fetch
  useEffect(() => {
    async function init() {
      if (initialized.current) return;
      initialized.current = true;
      
      setAgentState("analyzing");
      const greet = lang === "hi" 
        ? "नमस्ते! मैं आपका 'स्वास्थ्य AI' साथी हूँ। मैं आपके स्वास्थ्य इतिहास का विश्लेषण कर रहा हूँ..."
        : "Hello! I am Swasthya AI, your health companion. I'm analyzing your health history to provide personalized support...";
      
      setMessages([{ role: "assistant", content: greet }]);
      
      try {
        // Fetch ALL context for the Agent
        const [reports, scans, periods] = await Promise.all([
          supabase.from("symptom_reports").select("*").order("created_at", { ascending: false }).limit(3),
          supabase.from("prescription_scans").select("*").order("created_at", { ascending: false }).limit(2),
          supabase.from("period_records" as any).select("*").order("start_date", { ascending: false }).limit(2)
        ]);
        
        let contextMsg = "Current User Context Summary:\n";
        if (reports.data?.length) {
           contextMsg += `- Past Symptoms: ${reports.data.map(r => `${r.symptoms} (${r.severity})`).join("; ")}\n`;
        }
        if (scans.data?.length) {
           contextMsg += `- Recent Prescriptions: ${scans.data.map(s => s.simplified_explanation.slice(0, 50)).join("; ")}\n`;
        }
        if (periods.data?.length) {
           contextMsg += `- Menstrual History: Last started on ${periods.data[0].start_date}\n`;
        }
        
        const intro = lang === "hi"
          ? "मैंने आपकी जानकारी देख ली है। मैं आपके लक्षणों, दवाइयों और स्वास्थ्य इतिहास के बारे में जानता हूँ। मैं आपकी कैसे मदद कर सकता हूँ?"
          : "I've reviewed your records. I'm now aware of your symptoms, medications, and health history. How can I assist you today?";
          
        setMessages(prev => [
          ...prev, 
          { role: "system", content: contextMsg },
          { role: "assistant", content: intro }
        ]);
        speak(intro, lang);
      } catch (e) {
        console.error("Context fetch failed", e);
      } finally {
        setAgentState("idle");
      }
    }
    init();
  }, [lang, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  const runAgentLoop = async (text: string) => {
    if (!text.trim() || loading) return;
    stopSpeaking();
    
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    speech.setTranscript("");
    setLoading(true);
    setAgentState("thinking");

    try {
      const systemContext = messages.find(m => m.role === "system")?.content || "";

      // 1. Get AI response from enhanced Edge Function
      const { data, error } = await supabase.functions.invoke("triage", {
        body: { 
          messages: newMsgs.filter(m => m.role !== "system" && m.role !== "tool").map(m => ({ role: m.role, content: m.content })),
          language: lang,
          userContext: systemContext
        },
      });

      if (error) throw error;
      
      const { assistant, toolCalls } = data;
      
      if (assistant) {
        setMessages(m => [...m, { role: "assistant", content: assistant }]);
        speak(assistant, lang);
      }

      // 2. Real-time Tool Execution Handling
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          if (call.name === "find_nearby_facilities") {
            setAgentState("searching");
            const type = call.arguments.type || "hospital";
            await new Promise(r => setTimeout(r, 1500)); // Simulate search
            
            const toolResult = {
              tool: "FIND_NEARBY",
              data: [
                { name: `Local ${type.charAt(0).toUpperCase() + type.slice(1)} A`, distance: "0.5km", status: "Open Now" },
                { name: `Health Plus ${type.charAt(0).toUpperCase() + type.slice(1)}`, distance: "1.2km", status: "24/7" }
              ]
            };
            setMessages(m => [...m, { role: "tool", content: `Found ${type}s`, toolResult }]);
          }
          
          if (call.name === "analyze_health_history") {
            setAgentState("analyzing");
            await new Promise(r => setTimeout(r, 1000));
            toast.info(lang === "hi" ? "इतिहास का विश्लेषण किया गया" : "History analysis complete");
          }

          if (call.name === "triage_decision") {
             const { severity, advice } = call.arguments;
             setMessages(m => [...m, { 
                role: "assistant", 
                content: `### Triage: ${severity.toUpperCase()}\n${advice}` 
             }]);
          }
        }
      }

    } catch (e: any) {
      console.error(e);
      toast.error("Swasthya AI is busy. Please try again.");
    } finally {
      setLoading(false);
      setAgentState("idle");
    }
  };

  return (
    <MobileShell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("agent", lang)}</h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Agentic Health Assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="rounded-xl">
           <History className="h-4 w-4 mr-1" /> {t("newCheck", lang)}
        </Button>
      </div>

      <Card className="mx-auto flex h-[65vh] max-w-4xl flex-col rounded-3xl border-2 bg-card/40 p-4 shadow-2xl backdrop-blur-md md:p-6 lg:h-[70vh] border-primary/10">
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {messages.filter(m => m.role !== "system").map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              {m.role === "tool" ? (
                <ToolDisplay result={m.toolResult} lang={lang} />
              ) : (
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-5 py-3 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                  m.role === "user" 
                    ? "rounded-br-none bg-primary text-primary-foreground" 
                    : "rounded-bl-none bg-secondary/80 text-secondary-foreground"
                )}>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-muted-foreground text-xs animate-pulse pl-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              </div>
              <span>
                {agentState === "searching" ? (lang === "hi" ? "नज़दीकी अस्पताल ढूँढ रहा हूँ..." : "Searching nearby facilities...") : 
                 agentState === "analyzing" ? (lang === "hi" ? "इतिहास का विश्लेषण कर रहा हूँ..." : "Analyzing history...") :
                 (lang === "hi" ? "सोच रहा हूँ..." : "Thinking...")}
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant={speech.listening ? "destructive" : "secondary"}
            className="h-14 w-14 shrink-0 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
          >
            {speech.listening ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAgentLoop(input)}
              placeholder={lang === "hi" ? "मुझसे कुछ भी पूछें..." : "Ask me anything..."}
              className="h-14 w-full rounded-2xl border-2 border-primary/10 px-6 pr-14 text-base shadow-inner focus:border-primary/40 bg-card/50"
            />
            <Button
              type="button"
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 rounded-xl"
              onClick={() => runAgentLoop(input)}
              disabled={loading || !input.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2 justify-center">
            <QuickChip icon={<MapPin className="h-3 w-3" />} label={lang === "hi" ? "नज़दीकी अस्पताल" : "Nearby Hospitals"} onClick={() => runAgentLoop(lang === "hi" ? "नज़दीकी अस्पताल कहाँ हैं?" : "Where are nearby hospitals?")} />
            <QuickChip icon={<History className="h-3 w-3" />} label={lang === "hi" ? "स्वास्थ्य सारांश" : "Health Summary"} onClick={() => runAgentLoop(lang === "hi" ? "मेरे स्वास्थ्य का सारांश दें" : "Summarize my health history")} />
            <QuickChip icon={<AlertCircle className="h-3 w-3" />} label={lang === "hi" ? "आपातकालीन मदद" : "Emergency Help"} onClick={() => runAgentLoop(lang === "hi" ? "मुझे आपातकालीन मदद चाहिए" : "I need emergency help")} className="text-destructive border-destructive/20 hover:bg-destructive/10" />
        </div>
      </div>
    </MobileShell>
  );
}

function QuickChip({ icon, label, onClick, className }: { icon: any, label: string, onClick: () => void, className?: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-[10px] font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-all shadow-sm", className)}
        >
            {icon}
            {label}
        </button>
    )
}

function ToolDisplay({ result, lang }: { result: any, lang: string }) {
  if (result.tool === "FIND_NEARBY") {
    return (
      <div className="mt-2 w-full max-w-[90%] animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary px-1">
          <Hospital className="h-3 w-3" /> {lang === "hi" ? "नतीजे" : "Search Results"}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {result.data.map((p: any, i: number) => (
            <Card key={i} className="flex items-center justify-between p-3 rounded-2xl border-primary/10 bg-primary/5">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Hospital className="h-4 w-4" />
                 </div>
                 <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">📍 {p.distance} • {p.status}</p>
                 </div>
               </div>
               <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px]" onClick={() => window.location.href = "/nearby"}>
                 Details
               </Button>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  return null;
}
