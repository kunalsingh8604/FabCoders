import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

const langCode = (l: Lang) => (l === "hi" ? "hi-IN" : "en-IN");

export function useSpeechRecognition(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = langCode(lang);
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, transcript, supported, start, stop, setTranscript };
}

let lastSpoken: { text: string; lang: Lang; rate: number } | null = null;

export function speak(text: string, lang: Lang, rate: number = 0.95) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode(lang);
  u.rate = rate;
  lastSpoken = { text, lang, rate };
  window.speechSynthesis.speak(u);
}

export function speakSlow(text: string, lang: Lang) {
  speak(text, lang, 0.6);
}

export function repeatLast() {
  if (lastSpoken) speak(lastSpoken.text, lastSpoken.lang, lastSpoken.rate);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
