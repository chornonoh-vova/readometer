import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@tanstack/react-router";
import { useActionState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Field, FieldLabel, FieldGroup, FieldDescription } from "./ui/field";
import { Alert, AlertTitle } from "./ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Loading..." : "Register"}
    </Button>
  );
}

export function RegisterForm({ className, ...props }: ComponentProps<"div">) {
  const router = useRouter();

  const register = async (_prevState: string | null, formData: FormData) => {
    const name = formData.get("name")!.toString();
    const email = formData.get("email")!.toString();
    const password = formData.get("password")!.toString();

    let error: string | null = null;

    await authClient.signUp.email(
      {
        name,
        email,
        password,
      },
      {
        onSuccess: () => router.navigate({ to: "/" }),
        onError: (ctx) => {
          error = ctx.error.message;
        },
      },
    );

    return error;
  };

  const [message, registerAction] = useActionState(register, null);

  return (
    <form action={registerAction}>
      <Card className={cn("flex flex-col gap-6", className)} {...props}>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Register a new account</CardTitle>
          <CardDescription>
            Enter your name and email below to create a new account
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
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="My name"
                autoComplete="name"
                required
              />
            </Field>

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
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                required
              />
            </Field>

            <Field>
              <Submit />

              <FieldDescription className="text-center">
                Already have an account? <Link to="/login">Login</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
