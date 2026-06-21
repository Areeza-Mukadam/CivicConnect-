import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useI18n } from "@/lib/i18n.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Droplet, Zap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills — CivicLink" }] }),
  component: Bills,
});

function Bills() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-bills"],
    queryFn: async () => (await supabase.from("bills").select("*").order("due_date", { ascending: true })).data ?? [],
  });

  const pay = useMutation({
    mutationFn: async (bill: { id: string; amount: number; user_id: string }) => {
      const { error: payErr } = await supabase.from("payments").insert({ bill_id: bill.id, user_id: bill.user_id, amount: bill.amount });
      if (payErr) throw payErr;
      const { error } = await supabase.from("bills").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", bill.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment successful (mock)"); qc.invalidateQueries({ queryKey: ["my-bills"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("bills")}</h1>
      {data?.length === 0 && <p className="text-sm text-muted-foreground">{t("no_bills")}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                {b.kind === "water" ? <Droplet className="h-5 w-5 text-primary" /> : <Zap className="h-5 w-5 text-warning-foreground" />}
                <CardTitle className="text-base capitalize">{b.kind} · {b.period_label}</CardTitle>
              </div>
              <Badge variant={b.status === "paid" ? "secondary" : b.status === "overdue" ? "destructive" : "default"}>{t(b.status)}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("amount")}</span><span className="font-semibold">${Number(b.amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("due")}</span><span>{format(new Date(b.due_date), "PP")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Consumer ID</span><span className="font-mono text-xs">{b.consumer_id}</span></div>
              {b.status !== "paid" && (
                <Button className="mt-2 w-full" onClick={() => pay.mutate({ id: b.id, amount: Number(b.amount), user_id: b.user_id })} disabled={pay.isPending}>
                  {t("pay_now")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
