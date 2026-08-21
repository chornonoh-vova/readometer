import { useState, type ComponentProps } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { AlertCircleIcon, CheckCircle2Icon, MailIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Field, FieldDescription, FieldGroup } from "./ui/field";
import { Alert, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

const GENERIC_ERROR = "Something went wrong. Please try again.";

// Codes better-auth appends to the callbackURL when a link cannot be used.
const LINK_ERRORS: Record<string, string> = {
  TOKEN_EXPIRED:
    "That verification link has expired. Send yourself a new one below.",
  INVALID_TOKEN:
    "That verification link isn't valid. Send yourself a new one below.",
  INVALID_USER: "That link was issued for a different account.",
  USER_NOT_FOUND: "That account no longer exists.",
};

function messageOr(message: string | undefined | null, fallback: string) {
  return message?.trim() ? message : fallback;
}

/** Internal paths only, so a crafted `redirect` cannot bounce the user off-site. */
export function safeRedirect(redirect: string | undefined): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/";
  }
  return redirect;
}

function verifyCallbackURL(redirect: string | undefined) {
  const target = safeRedirect(redirect);
  return target === "/"
    ? "/verify-email"
    : `/verify-email?redirect=${encodeURIComponent(target)}`;
}

export type VerifyEmailCardProps = {
  email?: string;
  error?: string;
  redirect?: string;
} & ComponentProps<"div">;

export function VerifyEmailCard({
  email,
  error,
  redirect,
  className,
  ...props
}: VerifyEmailCardProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign-up creates no session, so the address usually arrives as a search param.
  const address = session?.user.email ?? email;
  const linkError = error
    ? (LINK_ERRORS[error] ?? "That verification link could not be used.")
    : "";

  const handleResend = async () => {
    if (!address) return;

    setErrorMessage("");
    setSent(false);
    setLoading(true);

    try {
      const { error } = await authClient.sendVerificationEmail({
        email: address,
        // Failures redirect to `${callbackURL}?error=<code>`, so point them here.
        callbackURL: verifyCallbackURL(redirect),
      });

      if (error) {
        setErrorMessage(
          error.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : messageOr(error.message, GENERIC_ERROR),
        );
        return;
      }

      setSent(true);
    } catch (error) {
      setErrorMessage(messageOr(getErrorMessage(error), GENERIC_ERROR));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <Card className={cn("flex flex-col gap-6", className)} {...props}>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Verify your email</CardTitle>
        <CardDescription>
          {address ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{address}</span>.
              Click it to finish setting up your account.
            </>
          ) : (
            "Check your inbox for the verification link we sent when you signed up."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {linkError && !errorMessage && !sent && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{linkError}</AlertTitle>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{errorMessage}</AlertTitle>
            </Alert>
          )}

          {/* Hedged: sign-up returns a generic response for an existing address,
              so an already-verified user reaches this and the API reports
              success while sending nothing. */}
          {sent && (
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>
                If that address still needs verifying, a new link is on its way.
              </AlertTitle>
            </Alert>
          )}

          <Field>
            {address && (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleResend}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Sending...
                  </>
                ) : (
                  <>
                    <MailIcon />
                    Resend verification email
                  </>
                )}
              </Button>
            )}

            {session ? (
              <Button type="button" variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <FieldDescription className="text-center">
                Already verified? <Link to="/login">Sign in</Link>
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
