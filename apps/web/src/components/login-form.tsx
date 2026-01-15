import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { useActionState, type ComponentProps } from "react";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Loading..." : "Login"}
    </Button>
  );
}

export type LoginFormProps = {
  redirect: string;
} & ComponentProps<"div">;

export function LoginForm({ redirect, className, ...props }: LoginFormProps) {
  const router = useRouter();

  const login = async (_prevState: string | null, formData: FormData) => {
    const email = formData.get("email")!.toString();
    const password = formData.get("password")!.toString();
    const rememberMe = formData.get("remember-me") === "on";

    let error: string | null = null;

    await authClient.signIn.email(
      {
        email,
        password,
        rememberMe,
      },
      {
        onSuccess: () => router.navigate({ to: redirect }),
        onError: (ctx) => {
          error = ctx.error.message;
        },
      },
    );

    return error;
  };

  const [message, loginAction] = useActionState(login, null);

  return (
    <form action={loginAction}>
      <Card className={cn("flex flex-col gap-6", className)} {...props}>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {message && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{message}</AlertTitle>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="me@example.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field>
              <div className="flex justify-between items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a
                  href="#"
                  className="inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Field orientation="horizontal">
              <Checkbox id="remember-me" name="remember-me" />
              <FieldLabel htmlFor="remember-me" className="font-normal">
                Remember me
              </FieldLabel>
            </Field>

            <Field>
              <Submit />

              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link to="/register">Register</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
