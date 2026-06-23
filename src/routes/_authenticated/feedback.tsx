import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useI18n } from "@/lib/i18n.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { getUser } from "@/lib/authAdapter.ts";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [{ title: "Feedback — CivicLink" }] }),
  component: Feedback,
});

function Feedback() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [category, setCategory] = useState("water");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ward, setWard] = useState("");

  const { data } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: async () => (await supabase.from("complaints").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("complaints").insert({ user_id: user.id, category, subject, message, ward: ward || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint submitted");
      setSubject(""); setMessage(""); setWard("");
      qc.invalidateQueries({ queryKey: ["my-complaints"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t("submit_complaint")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">{t("utility_water")}</SelectItem>
                  <SelectItem value="electricity">{t("utility_electricity")}</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("subject")}</Label><Input required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} /></div>
            <div className="space-y-1.5"><Label>{t("ward")} (optional)</Label><Input value={ward} onChange={(e) => setWard(e.target.value)} maxLength={50} /></div>
            <div className="space-y-1.5"><Label>{t("message")}</Label><Textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} /></div>
            <Button disabled={submit.isPending}>{t("submit")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("recent_complaints")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.length === 0 && <p className="text-sm text-muted-foreground">No complaints yet.</p>}
          {data?.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{c.subject}</p>
                <Badge variant={c.status === "resolved" ? "secondary" : c.status === "in_progress" ? "default" : "outline"}>{t(c.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.category} · {format(new Date(c.created_at), "PPp")}</p>
              <p className="mt-2 text-sm">{c.message}</p>
              {c.admin_response && <p className="mt-2 rounded bg-muted p-2 text-sm"><span className="font-medium">Admin:</span> {c.admin_response}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
