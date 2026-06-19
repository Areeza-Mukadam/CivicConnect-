import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Assistant — CivicLink" }] }),
  component: Chat,
});

type Msg = { role: "user" | "assistant"; content: string };

function Chat() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("chat-rag", { body: { messages: next, language: lang } });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error((e as Error).message);
      setMessages(next);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const toggleRecord = async () => {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) { toast.error("Recording too short."); return; }
        setTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            const ext = rec.mimeType.includes("mp4") ? "mp4" : "webm";
            const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: { audio: base64, ext, language: lang } });
            if (error) throw error;
            setInput((prev) => (prev ? prev + " " : "") + (data.text ?? ""));
            inputRef.current?.focus();
          };
          reader.readAsDataURL(blob);
        } catch (e) { toast.error((e as Error).message); }
        finally { setTranscribing(false); }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch { toast.error("Microphone unavailable"); }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{t("chat")}</h1>
        <p className="text-sm text-muted-foreground">Powered by Lovable AI with retrieval over your community notices and bills.</p>
      </div>
      <Card ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary/60" />
              Ask in any language — try "When is my next water bill due?" or "Is there an outage in my ward?"
            </div>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{m.content}</div>
              ) : (
                <div className="max-w-[85%] whitespace-pre-wrap text-sm">{m.content}</div>
              )}
            </div>
          ))}
          {sending && <div className="text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Thinking...</div>}
        </div>
      </Card>
      <div className="flex items-end gap-2">
        <Button type="button" variant={recording ? "destructive" : "outline"} size="icon" onClick={toggleRecord} disabled={transcribing} title={t("voice_input")}>
          {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Textarea
          ref={inputRef}
          rows={2}
          value={input}
          placeholder={recording ? t("listening") : t("ask_anything")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="resize-none"
        />
        <Button onClick={send} disabled={sending || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
