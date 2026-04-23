"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { t } = useAppPreferences();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!isLogin) {
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            confirmPassword,
          }),
        });

        const registerPayload = await registerResponse.json();
        if (!registerResponse.ok) {
          const detail = Array.isArray(registerPayload.error?.details) ? registerPayload.error.details[0] : null;
          const detailMessage =
            detail && typeof detail === "object" && "message" in detail ? String(detail.message) : null;
          throw new Error(detailMessage ?? registerPayload.error?.message ?? t("auth.registerError"));
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(t("auth.invalidCredentials"));
      }

      toast.success(isLogin ? t("auth.loginSuccess") : t("auth.registerSuccess"));
      router.push("/dashboard/identity-pack");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="surface-card border-[var(--border)] bg-[var(--surface)]/92">
      <CardHeader className="space-y-2">
        <CardTitle>{isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}</CardTitle>
        <CardDescription>{isLogin ? t("auth.loginDescription") : t("auth.registerDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin ? (
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>

          {!isLogin ? (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.processing") : isLogin ? t("auth.loginAction") : t("auth.registerAction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
