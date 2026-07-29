import { Button, Heading, Text } from "react-email";
import { EmailLayout } from "./email-layout";

export function VerificationEmail({
  name,
  url,
}: {
  name: string | null;
  url: string;
}) {
  return (
    <EmailLayout preview="Verify your email address for Readometer">
      <Heading className="mt-0 mb-4 text-xl font-semibold text-foreground">
        Verify your email address
      </Heading>
      <Text className="text-sm text-foreground">
        Hi {name}, thanks for starting the new Readometer account creation
        process.
      </Text>
      <Text className="text-sm text-foreground">
        Click the button below to confirm your email:
      </Text>
      <Button
        href={url}
        className="rounded-md bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground"
      >
        Verify email
      </Button>
      <Text className="text-sm text-foreground">Happy reading!</Text>
    </EmailLayout>
  );
}

export default VerificationEmail;
