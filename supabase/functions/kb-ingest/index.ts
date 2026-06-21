// Embed a piece of content (alert/notice/bill) into kb_chunks for RAG retrieval.
import { SUPABASE_URL, SERVICE_ROLE } from "../config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL_ENV = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;
const SERVICE_ROLE_ENV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? SERVICE_ROLE;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_type, source_id, title, content } = await req.json();
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Missing content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔑 Use Gemini embeddings instead of Lovable
    const er = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "embedding-001", text: content }),
      }
    );

    if (!er.ok) {
      const text = await er.text();
      return new Response(
        JSON.stringify({ error: "Embedding failed", detail: text }),
        { status: er.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embedding = (await er.json()).embedding?.value;
    if (!embedding) {
      return new Response(
        JSON.stringify({ error: "No embedding returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔑 Insert into Supabase
    const ins = await fetch(`${SUPABASE_URL_ENV}/rest/v1/kb_chunks`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_ENV,
        Authorization: `Bearer ${SERVICE_ROLE_ENV}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ source_type, source_id, title, content, embedding }),
    });

    if (!ins.ok) {
      const text = await ins.text();
      return new Response(
        JSON.stringify({ error: "DB insert failed", detail: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
