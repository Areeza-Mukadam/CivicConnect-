// Chat assistant with RAG over kb_chunks + admin "summarize" mode.
// CORS-safe, uses Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LANG_NAMES: Record<string, string> = { en: "English", hi: "Hindi", es: "Spanish" };

async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function retrieve(query: string): Promise<string> {
  const vec = await embed(query);
  if (!vec) return "";
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_kb_chunks`, {
    method: "POST",
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query_embedding: vec, match_count: 5 }),
  });
  if (!r.ok) return "";
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) return "";
  return rows.map((row: { title?: string; content: string }, i: number) => `[${i + 1}] ${row.title ?? ""}\n${row.content}`).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();

    // Admin summarize mode
    if (body.mode === "summarize") {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Summarize the utility notice in 1-2 short sentences for citizens. Keep it factual and clear." },
            { role: "user", content: body.text ?? "" },
          ],
        }),
      });
      const j = await r.json();
      const reply = j.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Chat with RAG
    const messages = body.messages as { role: "user" | "assistant"; content: string }[];
    const language = LANG_NAMES[body.language as string] ?? "English";
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const context = lastUser ? await retrieve(lastUser) : "";

    const sysPrompt = `You are CivicLink Assistant, helping citizens with water/electricity utility services.
Always reply in ${language}.
Be concise, factual, and friendly.
Use the provided CONTEXT (notices, bills, alerts) when relevant. If context is empty or insufficient, answer from general knowledge and clearly say so.
If asked about specific bill or account data not in context, ask the user to check the Bills page in the app.

CONTEXT:
${context || "(no retrieved context)"}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysPrompt }, ...messages],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace billing." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const reply = j.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
