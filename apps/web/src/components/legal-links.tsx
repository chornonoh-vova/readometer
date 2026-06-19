export function LegalLinks() {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      <a
        href="/privacy.html"
        className="underline underline-offset-4 hover:text-foreground"
      >
        Privacy Policy
      </a>
      {" · "}
      <a
        href="/terms.html"
        className="underline underline-offset-4 hover:text-foreground"
      >
        Terms of Service
      </a>
    </p>
  );
}
