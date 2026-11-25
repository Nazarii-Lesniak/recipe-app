"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { useAuthModalStore } from "../model/use-auth-modal-store";
import { LoginForm, RegisterForm } from "./auth-forms";

export function AuthModal() {
  const t = useTranslations("auth");
  const { isOpen, mode, reasonMessage, setMode, close } = useAuthModalStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? t("loginTitle") : t("registerTitle")}</DialogTitle>
          <DialogDescription>
            {reasonMessage ?? (mode === "login" ? t("loginSubtitle") : t("registerSubtitle"))}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v === "register" ? "register" : "login")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("loginSubmit")}</TabsTrigger>
            <TabsTrigger value="register">{t("registerSubmit")}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={close} onSwitchToRegister={() => setMode("register")} />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm onSuccess={close} onSwitchToLogin={() => setMode("login")} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
