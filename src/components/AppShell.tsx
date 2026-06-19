import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BellRing, Receipt, MessageSquare, MessagesSquare, ShieldCheck, LogOut, User, Languages, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n, LANG_LABELS, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const router = useRouterState();
  const path = router.location.pathname;
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setEmail(user.email ?? null);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (active) setIsAdmin(!!data?.some((r) => r.role === "admin"));
    })();
    return () => { active = false; };
  }, []);

  const navItems = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/alerts", label: t("alerts"), icon: BellRing },
    { to: "/bills", label: t("bills"), icon: Receipt },
    { to: "/feedback", label: t("feedback"), icon: MessageSquare },
    { to: "/chat", label: t("chat"), icon: MessagesSquare },
    ...(isAdmin ? [{ to: "/admin", label: t("admin"), icon: ShieldCheck }] : []),
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarNav items={navItems} path={path} />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">CL</div>
            <span className="hidden sm:inline">{t("app_name")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Languages className="h-4 w-4" /> {LANG_LABELS[lang]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLang(l)}>{LANG_LABELS[l]}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{email ?? ""}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>{t("profile")}</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />{t("sign_out")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <SidebarNav items={navItems} path={path} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ items, path }: { items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[]; path: string }) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((it) => {
        const active = path === it.to || path.startsWith(it.to + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
