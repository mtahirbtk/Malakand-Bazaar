"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

export function SignInForm() {
  const t = useTranslations("auth");
  const { login, signupCustomer } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState("sign-in");

  const [signInPhone, setSignInPhone] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");
  const [signInError, setSignInError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signUpError, setSignUpError] = React.useState<string | null>(null);

  function redirectAfterAuth(loggedInUser: User) {
    const next = searchParams.get("next");
    router.push(next || (loggedInUser.role === "seller" ? "/seller/dashboard/listings" : "/"));
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const result = login(signInPhone, signInPassword);
    if (!result.ok) {
      setSignInError(result.error);
      return;
    }
    setSignInError(null);
    redirectAfterAuth(result.user);
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const result = signupCustomer(phone, password, name);
    if (!result.ok) {
      setSignUpError(result.error);
      return;
    }
    setSignUpError(null);
    redirectAfterAuth(result.user);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "sign-in", label: t("signInTab") },
          { value: "create-account", label: t("createAccountTab") },
        ]}
      >
        <TabPanel value="sign-in" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <FormField label={t("phoneLabel")} htmlFor="si-phone" required>
              <Input
                id="si-phone"
                leadingIcon="call"
                placeholder={t("phonePlaceholder")}
                value={signInPhone}
                onChange={(e) => setSignInPhone(e.target.value)}
              />
            </FormField>
            <FormField label={t("passwordLabel")} htmlFor="si-password" required>
              <Input
                id="si-password"
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
            </FormField>
            {signInError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {signInError}
              </p>
            )}
            <Button type="submit" className="w-full">
              {t("signInCta")}
            </Button>
          </form>
        </TabPanel>
        <TabPanel value="create-account" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <FormField label={t("nameLabel")} htmlFor="su-name" required>
              <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label={t("phoneLabel")} htmlFor="su-phone" required>
              <Input
                id="su-phone"
                leadingIcon="call"
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <FormField label={t("passwordLabel")} htmlFor="su-password" required hint={t("passwordHint")}>
              <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            {signUpError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {signUpError}
              </p>
            )}
            <Button type="submit" className="w-full">
              {t("createAccountCta")}
            </Button>
          </form>
        </TabPanel>
      </Tabs>
    </div>
  );
}
