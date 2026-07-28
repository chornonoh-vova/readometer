import * as React from "react";
import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Tailwind,
  Text,
} from "react-email";
import tailwindConfig from "../tailwind.config";

// Path data from lucide-react's LibraryBig icon, matching apps/web's sidebar brand mark.
function LibraryBigIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary-foreground"
    >
      <rect width="8" height="18" x="3" y="3" rx="1" />
      <path d="M7 3v18" />
      <path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" />
    </svg>
  );
}

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
        />
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body className="bg-muted font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-10 max-w-[480px] rounded-lg border border-solid border-border bg-background px-8 py-10">
            <Row className="mb-6">
              <Column className="w-9">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary">
                  <LibraryBigIcon />
                </div>
              </Column>
              <Column>
                <Text className="m-0 pl-2 text-base font-semibold text-foreground">
                  Readometer
                </Text>
              </Column>
            </Row>
            {children}
            <Hr className="my-6 border-border" />
            <Text className="m-0 text-xs text-muted-foreground">
              If you didn't request this, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
