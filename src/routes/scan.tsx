import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Sparkles, Save, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { speak } from "@/hooks/useSpeech";

export const Route = createFileRoute("/scan")({
  component: () => (
    <RequireAuth redirect="/scan">
      <Scan />
    </RequireAuth>
  ),
});

function Scan() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = (f: File) => {
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setExplanation(null);
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("scan-prescription", {
          body: { imageBase64: dataUrl, language: lang },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setExplanation(data.explanation ?? "");
      } catch (e: any) {
        toast.error(e.message ?? "Could not read prescription");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const save = async () => {
    if (!explanation || !user) return;
    const { error } = await supabase.from("prescription_scans").insert({
      user_id: user.id,
      extracted_text: explanation.slice(0, 4000),
      simplified_explanation: explanation,
      language: lang,
    });
    if (error) toast.error(error.message);
    else toast.success(lang === "hi" ? "सहेज लिया" : "Saved");
  };

  return (
    <MobileShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: Input & Preview */}
        <div className="flex-1">
          <Card className="rounded-3xl border-2 p-6 shadow-xl transition-all hover:border-primary/30">
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl bg-muted/20 ring-1 ring-border">
                <img src={preview} alt="prescription" className="max-h-80 w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-4 border-dashed border-muted bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/30">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <p className="max-w-xs px-6 text-center text-sm font-medium leading-relaxed">
                  {lang === "hi"
                    ? "नुस्खा की फोटो अपलोड करें या खींचें — AI सरल भाषा में समझाएगा।"
                    : "Upload or capture a prescription. AI will explain it in simple language."}
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              <Button size="lg" variant="secondary" className="h-14 rounded-2xl shadow-md transition-all hover:scale-[1.02]" onClick={() => camRef.current?.click()}>
                <Camera className="mr-3 h-5 w-5" />
                {lang === "hi" ? "कैमरा" : "Camera"}
              </Button>
              <Button size="lg" className="h-14 rounded-2xl shadow-md transition-all hover:scale-[1.02]" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-3 h-5 w-5" /> {t("uploadImage", lang)}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="flex-1">
          {loading && (
            <Card className="flex animate-pulse items-center gap-4 rounded-3xl border-primary/20 bg-primary/5 p-6 shadow-md">
              <Sparkles className="h-6 w-6 animate-bounce text-primary" />
              <p className="text-lg font-semibold text-primary">{t("scanning", lang)}</p>
            </Card>
          )}

          {explanation && (
            <Card className="rounded-3xl border-trust/30 bg-trust/5 p-6 shadow-xl backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-trust animate-pulse" />
                  <p className="text-sm font-bold uppercase tracking-wider text-trust">
                    {lang === "hi" ? "AI व्याख्या" : "AI Explanation"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => speak(explanation, lang)}
                  className="rounded-full text-trust hover:bg-trust/10"
                  aria-label="Listen"
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{explanation}</p>
              <Button onClick={save} size="lg" variant="secondary" className="mt-6 w-full rounded-2xl bg-trust/10 text-trust hover:bg-trust/20">
                <Save className="mr-3 h-5 w-5" /> {t("saveReport", lang)}
              </Button>
            </Card>
          )}

          {!loading && !explanation && (
            <div className="hidden lg:flex lg:h-full lg:flex-col lg:items-center lg:justify-center lg:p-10 lg:text-muted-foreground">
               <p className="text-center italic opacity-50">Results will appear here...</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">{t("disclaimer", lang)}</p>
    </MobileShell>
  );
}
