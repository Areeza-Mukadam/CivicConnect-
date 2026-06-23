import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useI18n } from "@/lib/i18n.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { AlertIcon, SeverityBadge } from "./dashboard.tsx";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — CivicLink" }] }),
  component: Alerts,
});

function Alerts() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await supabase.from("alerts").select("*").order("starts_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("alerts")}</h1>
      {data?.length === 0 && <p className="text-sm text-muted-foreground">{t("no_alerts")}</p>}
      <div className="space-y-3">
        {data?.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
              <AlertIcon type={a.type} />
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-base">{a.title} <SeverityBadge sev={a.severity} /></CardTitle>
                <p className="text-xs text-muted-foreground">{format(new Date(a.starts_at), "PPp")}{a.ward ? ` · Ward ${a.ward}` : ""}</p>
              </div>
            </CardHeader>
            <CardContent>
              {a.summary && <p className="mb-2 rounded-md bg-muted/60 p-2 text-sm italic text-muted-foreground">{a.summary}</p>}
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
