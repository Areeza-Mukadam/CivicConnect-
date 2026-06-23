import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useI18n, type Lang, LANG_LABELS } from "@/lib/i18n.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getUser } from "@/lib/authAdapter.ts";
export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CivicLink" }] }),
  component: Profile,
});

function Profile() {
  const { t, setLang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", ward: "", water_consumer_id: "", electricity_consumer_id: "", preferred_language: "en" });

  const { data } = useQuery({
    queryKey: ["profile-edit"],
    queryFn: async () => {
      const { data: { user } } = await getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) setForm({
      full_name: data.full_name ?? "", phone: data.phone ?? "", ward: data.ward ?? "",
      water_consumer_id: data.water_consumer_id ?? "", electricity_consumer_id: data.electricity_consumer_id ?? "",
      preferred_language: data.preferred_language ?? "en",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setLang(form.preferred_language as Lang);
      qc.invalidateQueries({ queryKey: ["profile-edit"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>{t("profile")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("full_name")}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("ward")}</Label><Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("consumer_id_water")}</Label><Input value={form.water_consumer_id} onChange={(e) => setForm({ ...form, water_consumer_id: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("consumer_id_electricity")}</Label><Input value={form.electricity_consumer_id} onChange={(e) => setForm({ ...form, electricity_consumer_id: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("language")}</Label>
            <Select value={form.preferred_language} onValueChange={(v) => setForm({ ...form, preferred_language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LANG_LABELS) as Lang[]).map((l) => <SelectItem key={l} value={l}>{LANG_LABELS[l]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Button disabled={save.isPending}>{t("save")}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
