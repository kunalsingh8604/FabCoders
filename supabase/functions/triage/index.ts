// Edge function: Agentic Health Assistant
// Uses Lovable AI Gateway with advanced tool-calling.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Msg = { role: "user" | "assistant" | "system"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, userContext } = (await req.json()) as {
      messages: Msg[];
      language?: "en" | "hi";
      userContext?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const lang = language === "hi" ? "Hindi" : "English";

    const system = `You are Swasthya AI, a powerful and compassionate Agentic Health Companion.
Your goal is to provide the BEST health guidance using available tools and user history.

USER CONTEXT:
${userContext || "No history available yet."}

COMMUNICATION STYLE:
- Language: ${lang}.
- Tone: Empathetic, professional, and clear.
- Avoid jargon. Use simple analogies for complex medical terms.

YOUR CAPABILITIES (TOOLS):
1. triage_decision: Use this when the user reports symptoms. Classify as emergency, moderate, or mild.
2. find_nearby_facilities: Use this if the user asks for a hospital, clinic, or pharmacy.
3. analyze_health_history: Use this if the user asks about trends in their past reports or periods.
4. provide_first_aid: Provide immediate, safe first-aid steps while waiting for care.

IMPORTANT RULES:
- NEVER prescribe medication or give final diagnoses.
- For emergencies, ALWAYS prioritize the triage_decision tool and advise immediate hospital visit.
- If history shows recurring symptoms (e.g., frequent fever), mention it and suggest a detailed checkup.
- Be proactive. If a user asks about a symptom, offer to find a nearby clinic.

Always remind the user that you are an AI and not a replacement for a doctor.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "triage_decision",
          description: "Final triage classification for reported symptoms.",
          parameters: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["emergency", "moderate", "mild"] },
              summary: { type: "string" },
              advice: { type: "string" },
              red_flags: { type: "array", items: { type: "string" } },
            },
            required: ["severity", "summary", "advice"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "find_nearby_facilities",
          description: "Search for hospitals, clinics, or pharmacies nearby.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["hospital", "clinic", "pharmacy"] },
              urgency: { type: "string", enum: ["high", "normal"] },
            },
            required: ["type"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "analyze_health_history",
          description: "Summarize and find trends in user's historical health data.",
          parameters: {
            type: "object",
            properties: {
              focus_area: { type: "string", description: "e.g., symptoms, periods, or prescriptions" },
            },
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        tools,
      }),
    });

    if (!response.ok) throw new Error("AI gateway failed");

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls;

    // Backward compatibility for triage_decision
    let triage = null;
    const triageCall = toolCalls?.find((tc: any) => tc.function.name === "triage_decision");
    if (triageCall) {
      triage = JSON.parse(triageCall.function.arguments);
    }

    return new Response(
      JSON.stringify({ 
        assistant: choice?.content || "", 
        triage,
        toolCalls: toolCalls?.map((tc: any) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
