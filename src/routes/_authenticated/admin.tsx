import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — CivicLink" }] }),
  component: Admin,
});

function Admin() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  const complaints = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => (await supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: role.data === true,
  });

  const alertsByType = useQuery({
    queryKey: ["admin-alerts-by-type"],
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("type");
      const counts: Record<string, number> = { water: 0, electricity: 0, general: 0 };
      data?.forEach((a) => { counts[a.type] = (counts[a.type] ?? 0) + 1; });
      return Object.entries(counts).map(([type, count]) => ({ type, count }));
    },
    enabled: role.data === true,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: "open" | "in_progress" | "resolved"; response?: string }) => {
      const { error } = await supabase.from("complaints").update({ status, admin_response: response ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-complaints"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!role.data) return (
    <Card><CardContent className="flex items-center gap-3 p-6"><ShieldAlert className="h-5 w-5 text-destructive" /> Admin access required.</CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("admin_overview")}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <NewAlertCard />
        <Card>
          <CardHeader><CardTitle>Alerts by type</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={alertsByType.data ?? []}>
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("all_complaints")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {complaints.data?.length === 0 && <p className="text-sm text-muted-foreground">No complaints.</p>}
          {complaints.data?.map((c) => (
            <ComplaintRow key={c.id} c={c} onUpdate={(status, response) => updateStatus.mutate({ id: c.id, status, response })} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplaintRow({ c, onUpdate }: { c: { id: string; subject: string; category: string; created_at: string; ward: string | null; message: string; status: string; admin_response: string | null }; onUpdate: (status: "open" | "in_progress" | "resolved", response?: string) => void }) {
  const [response, setResponse] = useState(c.admin_response ?? "");
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved">(c.status as "open" | "in_progress" | "resolved");
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{c.subject}</p>
          <p className="text-xs text-muted-foreground">{c.category}{c.ward ? ` · Ward ${c.ward}` : ""} · {format(new Date(c.created_at), "PPp")}</p>
        </div>
        <Badge variant={status === "resolved" ? "secondary" : status === "in_progress" ? "default" : "outline"}>{status}</Badge>
      </div>
      <p className="mt-2 text-sm">{c.message}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Reply to citizen..." />
        <Select value={status} onValueChange={(v) => setStatus(v as "open" | "in_progress" | "resolved")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">open</SelectItem>
            <SelectItem value="in_progress">in_progress</SelectItem>
            <SelectItem value="resolved">resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => onUpdate(status, response)}>Update</Button>
      </div>
    </div>
  );
}

function NewAlertCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", type: "water", severity: "info", ward: "" });
  const [summary, setSummary] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const generate = async () => {
    if (!form.body.trim()) return toast.error("Add a body first");
    setGenLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-rag", { body: { mode: "summarize", text: form.body } });
      if (error) throw error;
      setSummary(data.reply ?? "");
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenLoading(false); }
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("alerts").insert({
        title: form.title, body: form.body, summary: summary || null,
        type: form.type as "water" | "electricity" | "general",
        severity: form.severity as "info" | "warning" | "critical",
        ward: form.ward || null, created_by: user.id,
      }).select().single();
      if (error) throw error;
      // Fire-and-forget embed
      supabase.functions.invoke("kb-ingest", { body: { source_type: "alert", source_id: data.id, title: data.title, content: `${data.title}\n${data.body}` } }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Alert published");
      setForm({ title: "", body: "", type: "water", severity: "info", ward: "" });
      setSummary("");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["recent-alerts"] });
      qc.invalidateQueries({ queryKey: ["admin-alerts-by-type"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>{t("new_alert")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>{t("title")}</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">{t("utility_water")}</SelectItem>
                  <SelectItem value="electricity">{t("utility_electricity")}</SelectItem>
                  <SelectItem value="general">{t("utility_general")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("severity")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">info</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="critical">critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t("ward")} (optional)</Label><Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t("body")}</Label><Textarea rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>{t("ai_summary")}</Label>
                <Button type="button" size="sm" variant="outline" onClick={generate} disabled={genLoading}>
                  {genLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {t("generate_summary")}
                </Button>
              </div>
              <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Auto-generated summary will appear here" />
            </div>
          </div>
          <Button disabled={create.isPending}>{t("create")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
