// Voice transcription via Gemini Speech-to-Text
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { audio, ext, language } = await req.json();
    if (!audio) {
      return new Response(
        JSON.stringify({ error: "Missing audio" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Decode base64 → bytes
    const binStr = atob(audio);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

    const mime = ext === "mp4" ? "audio/mp4" : "audio/webm";
    const filename = `recording.${ext === "mp4" ? "mp4" : "webm"}`;
    const blob = new Blob([bytes], { type: mime });

    const fd = new FormData();
    fd.append("file", blob, filename);

    // Gemini transcription model
    fd.append("model", "gemini-1.5-flash"); // or "gemini-1.5-pro" if available
    if (language && ["en", "hi", "es"].includes(language)) {
      fd.append("language", language);
    }

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:transcribe",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}` },
        body: fd,
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return new Response(
        JSON.stringify({ error: "Transcription failed", detail: text }),
        {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const j = await r.json();
    return new Response(
      JSON.stringify({ text: j.text ?? "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
