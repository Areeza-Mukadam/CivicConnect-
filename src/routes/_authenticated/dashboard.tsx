import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useI18n } from "@/lib/i18n.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { BellRing, Receipt, MessageSquare, ArrowRight, Droplet, Zap, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getUser } from "@/lib/authAdapter.ts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CivicLink" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();

  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [alerts, bills, complaints] = await Promise.all([
        supabase.from("alerts").select("id", { count: "exact", head: true }).gte("starts_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("bills").select("id", { count: "exact", head: true }).eq("status", "unpaid"),
        supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return { alerts: alerts.count ?? 0, bills: bills.count ?? 0, complaints: complaints.count ?? 0 };
    },
  });

  const recentAlerts = useQuery({
    queryKey: ["recent-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("*").order("starts_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("hello")}{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""} 👋</h1>
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<BellRing className="h-5 w-5" />} label={t("active_alerts")} value={stats.data?.alerts ?? 0} tone="primary" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label={t("unpaid_bills")} value={stats.data?.bills ?? 0} tone="warning" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label={t("open_complaints")} value={stats.data?.complaints ?? 0} tone="muted" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("recent_alerts")}</CardTitle>
          <Link to="/alerts"><Button variant="ghost" size="sm" className="gap-1">{t("view_all")} <ArrowRight className="h-3 w-3" /></Button></Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAlerts.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("no_alerts")}</p>}
          {recentAlerts.data?.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
              <AlertIcon type={a.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <SeverityBadge sev={a.severity} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.summary || a.body}</p>
                {a.ward && <p className="mt-1 text-xs text-muted-foreground">Ward {a.ward}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "warning" | "muted" }) {
  const toneCls = tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneCls}`}>{icon}</div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertIcon({ type }: { type: string }) {
  const cls = "h-5 w-5 mt-0.5 shrink-0";
  if (type === "water") return <Droplet className={`${cls} text-primary`} />;
  if (type === "electricity") return <Zap className={`${cls} text-warning-foreground`} />;
  return <Info className={`${cls} text-muted-foreground`} />;
}

export function SeverityBadge({ sev }: { sev: string }) {
  const variant = sev === "critical" ? "destructive" : sev === "warning" ? "default" : "secondary";
  return <Badge variant={variant as "destructive" | "default" | "secondary"} className="text-[10px] uppercase tracking-wide">{sev}</Badge>;
}
