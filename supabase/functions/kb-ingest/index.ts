// Embed a piece of content (alert/notice/bill) into kb_chunks for RAG retrieval.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { source_type, source_id, title, content } = await req.json();
    if (!content) return new Response(JSON.stringify({ error: "Missing content" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: content }),
    });
    if (!er.ok) {
      const text = await er.text();
      return new Response(JSON.stringify({ error: "Embedding failed", detail: text }), { status: er.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const embedding = (await er.json()).data[0].embedding;

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/kb_chunks`, {
      method: "POST",
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ source_type, source_id, title, content, embedding }),
    });
    if (!ins.ok) {
      const text = await ins.text();
      return new Response(JSON.stringify({ error: "DB insert failed", detail: text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
