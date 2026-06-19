import { cn } from "@/lib/utils";
import { useState, type ComponentProps } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";
import * as z from "zod";
import { useForm } from "@tanstack/react-form";
import { Turnstile } from "@marsidev/react-turnstile";
import { Spinner } from "./ui/spinner";

import GoogleIcon from "@/assets/icons/google.svg?react";
import { signInWithGoogle } from "@/lib/google-sign-in";

const loginFormSchema = z.object({
  email: z.email(),
  password: z.string().trim().nonempty().min(8).max(128),
  rememberMe: z.boolean(),
});

export type LoginFormProps = {
  redirect: string;
} & ComponentProps<"div">;

export function LoginForm({ redirect, className, ...props }: LoginFormProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const defaultValues: z.input<typeof loginFormSchema> = {
    email: "",
    password: "",
    rememberMe: false,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: loginFormSchema,
    },
    onSubmit: ({ value }) => {
      const data = loginFormSchema.parse(value);

      setErrorMessage("");
      setLoading(true);

      authClient.signIn.email({
        ...data,
        fetchOptions: {
          headers: {
            "x-captcha-response": token,
          },
          onSuccess: () => router.navigate({ to: redirect }),
          onError: (ctx) => {
            setErrorMessage(ctx.error.message);
            setLoading(false);
          },
        },
      });
    },
  });

  const handleGoogleSignIn = () =>
    signInWithGoogle(redirect, setErrorMessage, setLoading);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card className={cn("flex flex-col gap-6", className)} {...props}>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to pick up where you left off
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

            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={loading}
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon />
              Sign in with Google
            </Button>

            <FieldSeparator>Or continue with</FieldSeparator>

            <form.Field
              name="email"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="email"
                      aria-invalid={isInvalid}
                      required
                      placeholder="me@example.com"
                      autoComplete="email"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="password"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      aria-invalid={isInvalid}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="rememberMe"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field orientation="horizontal" data-invalid={isInvalid}>
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldLabel htmlFor={field.name} className="font-normal">
                      Remember me
                    </FieldLabel>
                  </Field>
                );
              }}
            />

            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={setToken}
            />

            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <FieldDescription className="text-center">
                New here? <Link to="/register">Create an account</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
