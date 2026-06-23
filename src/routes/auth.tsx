import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n.tsx";
import { auth } from "../firebaseConfig.ts"; 
import { supabase } from "@/integrations/supabase/client.ts";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — CivicConnect" }],
  }),

  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    if (auth.currentUser) {
      throw redirect({ to: "/dashboard" });
    }
  },

  component: AuthPage,
});

const ensureProfile = async (user: any) => {
  await (supabase as any)
    .from("profiles")
    .upsert({
      id: user.uid,
      full_name: user.displayName ?? null,
    });
};

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

 const onSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const userCredential = await signInWithEmailAndPassword(
  auth,
  email,
  password
);

await ensureProfile(userCredential.user);

navigate({ to: "/dashboard" });
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};

 const onSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (fullName) {
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
    }

   await ensureProfile(userCredential.user);

toast.success("Account created successfully");
navigate({ to: "/dashboard" });
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};

const onGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureProfile(result.user);

console.log("User signed in:", result.user);
navigate({ to: "/dashboard" });
  } catch (error: any) {
    toast.error(error.message);
  }
};

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden gradient-hero p-12 md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">CL</div>
          CivicLink
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">{t("tagline")}</h2>
          <p className="mt-3 max-w-md text-muted-foreground">Stay informed about outages, pay your utility bills, and get instant AI answers — all in your language.</p>
        </div>
        <div className="text-xs text-muted-foreground">Trusted by citizens · Secured by Lovable Cloud</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">{t("welcome_back")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create a new account to continue.</p>
          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
              <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={loading}>{t("sign_in")}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-1.5"><Label>{t("full_name")}</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={loading}>{t("sign_up")}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="relative my-6 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-background px-2">or</span>
            <span className="absolute left-0 top-1/2 h-px w-full bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={onGoogle}>{t("continue_google")}</Button>
        </div>
      </div>
    </div>
  );
}
