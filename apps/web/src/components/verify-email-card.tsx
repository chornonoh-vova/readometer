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

export type VerifyEmailCardProps = {
  /** Address carried over from sign-up or a blocked sign-in, when there is no session yet. */
  email?: string;
} & ComponentProps<"div">;

export function VerifyEmailCard({
  email,
  className,
  ...props
}: VerifyEmailCardProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign-up no longer creates a session, so the address usually arrives as a
  // search param. A pre-existing unverified session wins when there is one.
  const address = session?.user.email ?? email;

  const handleResend = async () => {
    if (!address) return;

    setErrorMessage("");
    setSent(false);
    setLoading(true);

    try {
      const { error } = await authClient.sendVerificationEmail({
        email: address,
        callbackURL: "/",
      });

      if (error) {
        // better-auth returns a plain error object here, not an Error, so read
        // .message directly the way the login and register forms do —
        // getErrorMessage is for caught exceptions and would stringify this.
        setErrorMessage(
          error.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : (error.message ?? "Something went wrong. Please try again."),
        );
        return;
      }

      setSent(true);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error) ?? "Something went wrong. Please try again.",
      );
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
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{errorMessage}</AlertTitle>
            </Alert>
          )}

          {sent && (
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>
                We sent a new verification link. Check your inbox.
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
