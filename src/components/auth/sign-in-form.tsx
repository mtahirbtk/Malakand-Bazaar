"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth, type AuthUser } from "@/lib/auth/auth-context";
import { phoneSchema, passwordSchema, requiredString } from "@/lib/validation/schemas";
import { useFormSubmit } from "@/lib/validation/use-form-submit";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { useToast } from "@/components/ui/toast";
import { TurnstileWidget, turnstileEnabled } from "./turnstile-widget";

type SignInValues = { phone: string; password: string };
type SignUpValues = { displayName: string; phone: string; password: string };

/**
 * Sign in and create account.
 *
 * Every check that matters runs on the server; this form's job is to
 * validate client-side before that round trip, collect two or three fields,
 * show what came back, and not submit twice.
 */
export function SignInForm() {
  const t = useTranslations("auth");
  const v = useTranslations("validation");
  const locale = useLocale();
  const { signIn, signUp } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState("sign-in");
  // Create Account starts on a Customer/Seller choice rather than dropping
  // straight into a form — a seller belongs on the fuller /sell flow, not
  // these three fields.
  const [accountType, setAccountType] = React.useState<"customer" | null>(null);

  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  const signInFormRef = React.useRef<HTMLFormElement>(null);
  const signUpFormRef = React.useRef<HTMLFormElement>(null);
  const [signInError, setSignInError] = React.useState<string | null>(null);
  const [signUpError, setSignUpError] = React.useState<string | null>(null);

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

  const signInFormik = useFormik<SignInValues>({
    initialValues: { phone: "", password: "" },
    validationSchema: Yup.object({ phone: phoneSchema(v), password: requiredString(v) }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: () => {},
  });

  const signUpFormik = useFormik<SignUpValues>({
    initialValues: { displayName: "", phone: "", password: "" },
    validationSchema: Yup.object({
      displayName: requiredString(v),
      phone: phoneSchema(v),
      password: passwordSchema(v),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: () => {},
  });

  const handleSignIn = useFormSubmit(
    signInFormik,
    signInFormRef,
    async (values) => {
      const user = await signIn({ phone: values.phone, password: values.password });
      // Fired before the navigation, not after: the toast lives in the root
      // layout's provider, so it survives the client-side route change and
      // is what greets the user on the page they land on.
      show({
        title: t("welcomeBackTitle", { name: user.displayName }),
        description: t("welcomeBackDescription"),
        tone: "success",
      });
      router.push(destinationFor(user));
    },
    setSignInError,
    "Something went wrong. Please try again."
  );

  const handleSignUp = useFormSubmit(
    signUpFormik,
    signUpFormRef,
    async (values) => {
      const user = await signUp({
        phone: values.phone,
        password: values.password,
        displayName: values.displayName,
        turnstileToken: turnstileToken ?? undefined,
      });
      show({
        title: t("accountCreatedTitle"),
        description: t("accountCreatedDescription", { name: user.displayName }),
        tone: "success",
      });
      router.push(destinationFor(user));
    },
    setSignUpError,
    "Something went wrong. Please try again."
  );

  return (
    <div className="mx-auto max-w-md space-y-6">
      {(signInFormik.isSubmitting || signUpFormik.isSubmitting) && (
        <FullscreenLoader label={signInFormik.isSubmitting ? t("signingIn") : t("creatingAccount")} />
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
          <form ref={signInFormRef} className="space-y-4" onSubmit={handleSignIn} noValidate>
            <FormField
              label={t("phoneLabel")}
              htmlFor="si-phone"
              required
              error={signInFormik.touched.phone ? signInFormik.errors.phone : undefined}
            >
              <PhoneInput
                id="si-phone"
                name="phone"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={signInFormik.values.phone}
                invalid={Boolean(signInFormik.touched.phone && signInFormik.errors.phone)}
                onChange={(e) => signInFormik.setFieldValue("phone", e.target.value)}
              />
            </FormField>

            <FormField
              label={t("passwordLabel")}
              htmlFor="si-password"
              required
              error={signInFormik.touched.password ? signInFormik.errors.password : undefined}
            >
              <Input
                id="si-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={signInFormik.values.password}
                invalid={Boolean(signInFormik.touched.password && signInFormik.errors.password)}
                onChange={(e) => signInFormik.setFieldValue("password", e.target.value)}
              />
            </FormField>

            <FormError message={signInError} />

            <Button
              type="submit"
              className="w-full"
              disabled={signInFormik.isSubmitting}
              aria-busy={signInFormik.isSubmitting}
            >
              {signInFormik.isSubmitting ? t("signingIn") : t("signInCta")}
            </Button>
          </form>
        </TabPanel>

        <TabPanel value="create-account" className="pt-6">
          {accountType !== "customer" ? (
            <AccountTypeChoice
              onChooseCustomer={() => setAccountType("customer")}
              onChooseSeller={() => router.push("/sell")}
            />
          ) : (
          <form ref={signUpFormRef} className="space-y-4" onSubmit={handleSignUp} noValidate>
            <button
              type="button"
              onClick={() => setAccountType(null)}
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              <span aria-hidden="true">←</span> {t("backToAccountType")}
            </button>

            <FormField
              label={t("nameLabel")}
              htmlFor="su-name"
              required
              error={signUpFormik.touched.displayName ? signUpFormik.errors.displayName : undefined}
            >
              <Input
                id="su-name"
                name="displayName"
                autoComplete="name"
                value={signUpFormik.values.displayName}
                invalid={Boolean(signUpFormik.touched.displayName && signUpFormik.errors.displayName)}
                onChange={(e) => signUpFormik.setFieldValue("displayName", e.target.value)}
              />
            </FormField>

            <FormField
              label={t("phoneLabel")}
              htmlFor="su-phone"
              required
              error={signUpFormik.touched.phone ? signUpFormik.errors.phone : undefined}
            >
              <PhoneInput
                id="su-phone"
                name="phone"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={signUpFormik.values.phone}
                invalid={Boolean(signUpFormik.touched.phone && signUpFormik.errors.phone)}
                onChange={(e) => signUpFormik.setFieldValue("phone", e.target.value)}
              />
            </FormField>

            <FormField
              label={t("passwordLabel")}
              htmlFor="su-password"
              required
              hint={t("passwordHint")}
              error={signUpFormik.touched.password ? signUpFormik.errors.password : undefined}
            >
              <Input
                id="su-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={signUpFormik.values.password}
                invalid={Boolean(signUpFormik.touched.password && signUpFormik.errors.password)}
                onChange={(e) => signUpFormik.setFieldValue("password", e.target.value)}
              />
            </FormField>

            <TurnstileWidget onToken={setTurnstileToken} locale={locale} />

            <FormError message={signUpError} />

            <Button
              type="submit"
              className="w-full"
              // Turnstile solves itself in about a second; keeping submit
              // disabled until it does avoids a guaranteed round trip that
              // could only fail.
              disabled={signUpFormik.isSubmitting || (turnstileEnabled() && !turnstileToken)}
              aria-busy={signUpFormik.isSubmitting}
            >
              {signUpFormik.isSubmitting ? t("creatingAccount") : t("createAccountCta")}
            </Button>
          </form>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

/**
 * Create Account opens here rather than on a form: a seller's fields don't
 * belong on this quick two-field flow, so the choice is made up front and a
 * seller is routed straight to `/sell` instead of being folded into these
 * three inputs.
 */
function AccountTypeChoice({
  onChooseCustomer,
  onChooseSeller,
}: {
  onChooseCustomer: () => void;
  onChooseSeller: () => void;
}) {
  const t = useTranslations("auth");
  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-semibold text-on-surface-muted">
        {t("chooseAccountTypeTitle")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AccountTypeCard
          icon="person"
          title={t("customerCardTitle")}
          description={t("customerCardDescription")}
          onClick={onChooseCustomer}
        />
        <AccountTypeCard
          icon="storefront"
          title={t("sellerCardTitle")}
          description={t("sellerCardDescription")}
          onClick={onChooseSeller}
        />
      </div>
    </div>
  );
}

function AccountTypeCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface p-6 text-center transition-colors hover:border-brand-600 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Icon name={icon} size={32} className="text-brand-600" />
      <span className="text-base font-bold text-on-surface">{title}</span>
      <span className="text-xs text-on-surface-muted">{description}</span>
    </button>
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
