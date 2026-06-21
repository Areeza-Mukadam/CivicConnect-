// Chat assistant with RAG over kb_chunks + admin "summarize" mode.
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SERVICE_ROLE = SUPABASE_SERVICE_ROLE_KEY;

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
};

async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "embedding-001", text }),
      }
    );
    const j = await res.json();
    return j.embedding?.value ?? null;
  } catch {
    return null;
  }
}

async function retrieve(query: string): Promise<string> {
  const vec = await embed(query);
  if (!vec) return "";
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_kb_chunks`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query_embedding: vec, match_count: 5 }),
  });
  if (!r.ok) return "";
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) return "";
  return rows
    .map(
      (row: { title?: string; content: string }, i: number) =>
        `[${i + 1}] ${row.title ?? ""}\n${row.content}`
    )
    .join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // 🔑 Admin summarize mode
    if (body.mode === "summarize") {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      "Summarize the utility notice in 1-2 short sentences for citizens. Keep it factual and clear.\n\n" +
                      (body.text ?? ""),
                  },
                ],
              },
            ],
          }),
        }
      );
      const j = await r.json();
      const reply = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔑 Chat with RAG
    const messages = body.messages as {
      role: "user" | "assistant";
      content: string;
    }[];
    const language = LANG_NAMES[body.language as string] ?? "English";
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const context = lastUser ? await retrieve(lastUser) : "";

    const sysPrompt = `You are CivicLink Assistant, helping citizens with water/electricity utility services.
Always reply in ${language}.
Be concise, factual, and friendly.
Use the provided CONTEXT (notices, bills, alerts) when relevant. If context is empty or insufficient, answer from general knowledge and clearly say so.
If asked about specific bill or account data not in context, ask the user to check the Bills page in the app.

CONTEXT:
${context || "(no retrieved context)"}`;

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { role: "system", parts: [{ text: sysPrompt }] },
            ...messages.map((m) => ({
              role: m.role,
              parts: [{ text: m.content }],
            })),
          ],
        }),
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: text }),
        {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const j = await r.json();
    const reply = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
