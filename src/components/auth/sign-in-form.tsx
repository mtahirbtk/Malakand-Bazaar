"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth, type AuthUser } from "@/lib/auth/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { useToast } from "@/components/ui/toast";
import { TurnstileWidget, turnstileEnabled } from "./turnstile-widget";

/**
 * Sign in and create account.
 *
 * Every check that matters runs on the server; this form's job is to collect
 * two fields, show what came back, and not submit twice.
 */
export function SignInForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { signIn, signUp } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState("sign-in");

  const [signInPhone, setSignInPhone] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  const signInState = useSubmitState();
  const signUpState = useSubmitState();

  /**
   * `next` comes from the URL, so it is only honoured when it is a relative
   * path on this site — otherwise a crafted link could bounce a freshly
   * signed-in user to an attacker's page.
   */
  function destinationFor(user: AuthUser): string {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return user.role === "seller" ? "/seller/dashboard/listings" : "/";
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    await signInState.run(async () => {
      const user = await signIn({ phone: signInPhone, password: signInPassword });
      // Fired before the navigation, not after: the toast lives in the root
      // layout's provider, so it survives the client-side route change and
      // is what greets the user on the page they land on.
      show({
        title: t("welcomeBackTitle", { name: user.displayName }),
        description: t("welcomeBackDescription"),
        tone: "success",
      });
      router.push(destinationFor(user));
    });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    await signUpState.run(async () => {
      const user = await signUp({
        phone,
        password,
        displayName: name,
        turnstileToken: turnstileToken ?? undefined,
      });
      show({
        title: t("accountCreatedTitle"),
        description: t("accountCreatedDescription", { name: user.displayName }),
        tone: "success",
      });
      router.push(destinationFor(user));
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {(signInState.pending || signUpState.pending) && (
        <FullscreenLoader label={signInState.pending ? t("signingIn") : t("creatingAccount")} />
      )}
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "sign-in", label: t("signInTab") },
          { value: "create-account", label: t("createAccountTab") },
        ]}
      >
        <TabPanel value="sign-in" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignIn} noValidate>
            <FormField
              label={t("phoneLabel")}
              htmlFor="si-phone"
              required
              error={signInState.fields.phone}
            >
              <PhoneInput
                id="si-phone"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={signInPhone}
                invalid={Boolean(signInState.fields.phone)}
                onChange={(e) => setSignInPhone(e.target.value)}
              />
            </FormField>

            <FormField
              label={t("passwordLabel")}
              htmlFor="si-password"
              required
              error={signInState.fields.password}
            >
              <Input
                id="si-password"
                type="password"
                autoComplete="current-password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
            </FormField>

            <FormError message={signInState.error} />

            <Button type="submit" className="w-full" disabled={signInState.pending} aria-busy={signInState.pending}>
              {signInState.pending ? t("signingIn") : t("signInCta")}
            </Button>
          </form>
        </TabPanel>

        <TabPanel value="create-account" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignUp} noValidate>
            <FormField
              label={t("nameLabel")}
              htmlFor="su-name"
              required
              error={signUpState.fields.displayName}
            >
              <Input
                id="su-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>

            <FormField label={t("phoneLabel")} htmlFor="su-phone" required error={signUpState.fields.phone}>
              <PhoneInput
                id="su-phone"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={phone}
                invalid={Boolean(signUpState.fields.phone)}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>

            <FormField
              label={t("passwordLabel")}
              htmlFor="su-password"
              required
              hint={t("passwordHint")}
              error={signUpState.fields.password}
            >
              <Input
                id="su-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <TurnstileWidget onToken={setTurnstileToken} locale={locale} />

            <FormError message={signUpState.error} />

            <Button
              type="submit"
              className="w-full"
              // Turnstile solves itself in about a second; keeping submit
              // disabled until it does avoids a guaranteed round trip that
              // could only fail.
              disabled={signUpState.pending || (turnstileEnabled() && !turnstileToken)}
              aria-busy={signUpState.pending}
            >
              {signUpState.pending ? t("creatingAccount") : t("createAccountCta")}
            </Button>
          </form>
        </TabPanel>
      </Tabs>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-semibold text-danger">
      {message}
    </p>
  );
}

/**
 * Submit bookkeeping shared by both forms: a pending flag that blocks a double
 * submit, a top-level message, and per-field messages lifted out of the API's
 * `fields` map so they render against the input that caused them.
 */
function useSubmitState() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const run = React.useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setFields({});
    try {
      await action();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setFields(caught.fields ?? {});
        // A message already shown beside a field would otherwise appear twice.
        setError(caught.fields && Object.keys(caught.fields).length ? null : caught.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, error, fields, run };
}
