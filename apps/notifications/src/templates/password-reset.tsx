import * as React from "react";
import { Button, Heading, Text } from "react-email";
import { EmailLayout } from "./email-layout";

export function PasswordReset({
  name,
  url,
}: {
  name: string | null;
  url: string;
}) {
  return (
    <EmailLayout preview="Reset your Readometer password">
      <Heading className="mt-0 mb-4 text-xl font-semibold text-foreground">
        Reset your password
      </Heading>
      <Text className="text-sm text-foreground">
        Hi {name}, we received a request to reset your Readometer password.
      </Text>
      <Text className="text-sm text-foreground">
        Click the button below to choose a new password:
      </Text>
      <Button
        href={url}
        className="rounded-md bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground"
      >
        Reset password
      </Button>
    </EmailLayout>
  );
}

export default PasswordReset;
