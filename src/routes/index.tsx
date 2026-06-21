import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { BellRing, Receipt, MessagesSquare, ShieldCheck, Languages, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.ts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicConnect — Smart utilities for citizens" },
      { name: "description", content: "Track outages, pay bills, get AI answers, and file complaints — all in one civic platform." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">CL</div>
          CivicConnect
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Built for modern cities
          </span>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Your community utilities, <span className="text-primary">simplified</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            CivicConnect brings outage alerts, bill payments, an AI assistant, and citizen feedback into one transparent platform — in your language, with your voice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg">Create free account</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">I have an account</Button></Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 self-center">
          {[
            { icon: BellRing, title: "Real-time alerts", body: "Water & power outages, push to your ward." },
            { icon: Receipt, title: "Bills & payments", body: "Pay water and electricity in one place." },
            { icon: MessagesSquare, title: "AI assistant", body: "RAG-powered answers about your services." },
            { icon: Mic, title: "Voice & multilingual", body: "Speak in English, हिन्दी, or Español." },
            { icon: ShieldCheck, title: "Complaints", body: "Track from submission to resolution." },
            { icon: Languages, title: "Admin insights", body: "Outage trends and complaint analytics." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">© CivicLink · Made for the community.</div>
      </footer>
    </div>
  );
}
