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
import { useSpeechRecognition, speak, speakSlow, repeatLast, stopSpeaking } from "@/hooks/useSpeech";
import { Mic, Send, Square, AlertTriangle, Clock, Sparkles, Save, RefreshCw, Volume2, Repeat, Type, Turtle, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/check")({
  component: () => (
    <RequireAuth redirect="/check">
      <SymptomCheck />
    </RequireAuth>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };
type Triage = {
  severity: "emergency" | "moderate" | "mild";
  summary: string;
  advice: string;
  red_flags?: string[];
};

function SymptomCheck() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [largeText, setLargeText] = useState(false);
  const speech = useSpeechRecognition(lang);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greet =
        lang === "hi"
          ? "नमस्ते! मुझे बताइए — आपको क्या तकलीफ़ है?"
          : "Hello! Please tell me — what symptoms are you feeling?";
      setMessages([{ role: "assistant", content: greet }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, triage, loading]);

  // Sync voice transcript into input
  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    stopSpeaking();
    const newMsgs = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(newMsgs);
    setInput("");
    speech.setTranscript("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("triage", {
        body: { messages: newMsgs, language: lang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.triage) {
        setTriage(data.triage as Triage);
        const closing =
          lang === "hi"
            ? "मेरा सुझाव नीचे देखें।"
            : "Here is my recommendation below.";
        setMessages((m) => [...m, { role: "assistant", content: closing }]);
        speak(`${(data.triage as Triage).advice}`, lang);
      } else if (data.assistant) {
        setMessages((m) => [...m, { role: "assistant", content: data.assistant }]);
        speak(data.assistant, lang);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not reach the AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopSpeaking();
    setMessages([]);
    setTriage(null);
    setInput("");
  };

  const save = async () => {
    if (!triage || !user) return;
    const symptoms = messages.filter((m) => m.role === "user").map((m) => m.content).join(" | ");
    const { error } = await supabase.from("symptom_reports").insert({
      user_id: user.id,
      symptoms,
      severity: triage.severity,
      advice: triage.advice,
      conversation: messages,
      language: lang,
    });
    if (error) toast.error(error.message);
    else toast.success(lang === "hi" ? "रिपोर्ट सहेज ली गई" : "Report saved");
  };

  return (
    <MobileShell>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t("symptomChecker", lang)}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant={largeText ? "default" : "outline"}
            size="sm"
            onClick={() => setLargeText((v) => !v)}
            aria-pressed={largeText}
            aria-label={t("largeText", lang)}
          >
            <Type className="mr-1 h-4 w-4" />
            {largeText ? t("normalText", lang) : t("largeText", lang)}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw className="mr-1 h-4 w-4" />
            {t("newCheck", lang)}
          </Button>
        </div>
      </div>

      {/* Voice controls for low-literacy users */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          className="h-12 rounded-2xl"
          onClick={() => {
            const last = [...messages].reverse().find((m) => m.role === "assistant");
            if (last) speakSlow(last.content, lang);
          }}
          aria-label={t("slow", lang)}
        >
          <Turtle className="mr-1 h-5 w-5" /> {t("slow", lang)}
        </Button>
        <Button
          variant="secondary"
          className="h-12 rounded-2xl"
          onClick={() => repeatLast()}
          aria-label={t("repeat", lang)}
        >
          <Repeat className="mr-1 h-5 w-5" /> {t("repeat", lang)}
        </Button>
        <Button
          variant="outline"
          className="h-12 rounded-2xl"
          onClick={() => stopSpeaking()}
          aria-label={t("stop", lang)}
        >
          <VolumeX className="mr-1 h-5 w-5" /> {t("stop", lang)}
        </Button>
      </div>

      <Card className="mx-auto flex h-[70vh] max-w-4xl flex-col rounded-3xl border bg-card/50 p-4 shadow-xl backdrop-blur-sm md:p-6 lg:h-[75vh]">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} lang={lang} largeText={largeText} />
          ))}
          {loading && (
            <div className={cn("flex items-center gap-3 text-muted-foreground", largeText ? "text-lg" : "text-sm")}>
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              {lang === "hi" ? "सोच रहा हूँ…" : "Thinking…"}
            </div>
          )}
          {triage && <TriageCard triage={triage} lang={lang} onSave={save} largeText={largeText} />}
        </div>
      </Card>

      {/* Input section */}
      <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant={speech.listening ? "destructive" : "secondary"}
            className="h-14 w-14 shrink-0 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            disabled={!speech.supported}
            aria-label={t("speak", lang)}
          >
            {speech.listening ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={speech.listening ? t("listening", lang) : t("describe", lang)}
            className="h-14 flex-1 rounded-2xl border-2 px-6 text-lg shadow-inner transition-colors focus:border-primary"
          />
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 shrink-0 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            aria-label={t("send", lang)}
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("disclaimer", lang)}</p>
      </div>
    </MobileShell>
  );
}

function Bubble({ msg, lang, largeText }: { msg: Msg; lang: "en" | "hi"; largeText?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm",
          largeText ? "text-lg" : "text-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-secondary text-secondary-foreground"
        )}
      >
        {msg.content}
        {!isUser && (
          <button
            onClick={() => speak(msg.content, lang)}
            className="ml-2 inline-flex align-middle text-muted-foreground hover:text-foreground"
            aria-label="Listen"
          >
            <Volume2 className={cn("inline", largeText ? "h-5 w-5" : "h-3.5 w-3.5")} />
          </button>
        )}
      </div>
    </div>
  );
}

function TriageCard({
  triage,
  lang,
  onSave,
  largeText,
}: {
  triage: Triage;
  lang: "en" | "hi";
  onSave: () => void;
  largeText?: boolean;
}) {
  const cfg = {
    emergency: {
      bg: "bg-emergency text-emergency-foreground",
      ring: "ring-emergency",
      icon: AlertTriangle,
      label: t("emergency", lang),
      emoji: "🔴",
    },
    moderate: {
      bg: "bg-moderate text-moderate-foreground",
      ring: "ring-moderate",
      icon: Clock,
      label: t("moderate", lang),
      emoji: "🟠",
    },
    mild: {
      bg: "bg-mild text-mild-foreground",
      ring: "ring-mild",
      icon: Sparkles,
      label: t("mild", lang),
      emoji: "🟢",
    },
  }[triage.severity];

  const Icon = cfg.icon;

  return (
    <div className={cn("mt-3 rounded-2xl border-2 p-4 ring-2 ring-offset-2", cfg.ring)}>
      <div className={cn("mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold", cfg.bg)}>
        <Icon className="h-4 w-4" /> {cfg.emoji} {cfg.label}
      </div>
      <p className={cn("font-semibold leading-relaxed", largeText ? "text-lg" : "text-sm")}>{triage.summary}</p>
      <p className={cn("mt-2 leading-relaxed text-foreground", largeText ? "text-lg" : "text-sm")}>{triage.advice}</p>
      {triage.red_flags && triage.red_flags.length > 0 && (
        <ul className={cn("mt-3 space-y-1 rounded-xl bg-muted/60 p-3", largeText ? "text-base" : "text-xs")}>
          {triage.red_flags.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-emergency" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Button onClick={onSave} variant="secondary" className="flex-1 rounded-xl">
          <Save className="mr-2 h-4 w-4" /> {t("saveReport", lang)}
        </Button>
      </div>
    </div>
  );
}
